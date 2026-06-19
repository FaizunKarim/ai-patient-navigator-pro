> ⚠️ **DEPRECATED — DOKUMEN HISTORIS (JANGAN DIIKUTI)**
>
> Dokumen ini mendeskripsikan **arsitektur LAMA berbasis Band Platform / Thenvoi SDK**
> yang **sudah tidak dipakai lagi**. Integrasi Band/Thenvoi & AI lokal sudah dihapus
> seluruhnya; chat pasien sekarang langsung terhubung ke AI Agent (Groq/OpenAI via
> `backend-api/services/aiAgentService.js`). Simpan dokumen ini hanya sebagai catatan
> sejarah/rancangan awal. Untuk arsitektur yang berlaku, lihat `docs/engineering.md`.
>
> ---

# BAGIAN 1: ARSITEKTUR CETAK BIRU (MASTER BLUEPRINT)

**ARSITEKTUR CETAK BIRU (MASTER BLUEPRINT)**
**Sistem Terdistribusi Multi-Agent & Manajemen Sesi Terintegrasi Platform Band**
**Nama Proyek:** Al Patient Navigator 
**Status Proyek:** Tahap Transisi & Pro Migrasi
**Skala:** Enterprise-Ready

## 1. Filosofi & Perubahan Arsitektur Dasar
Laporan ini disusun sebagai dokumen panduan mutlak (engineering blueprint) untuk menghentikan praktik pengembangan tanpa arah yang rentan kesalahan struktural (Vibe Coding). Berdasarkan analisis performa dari pengujian batas sistem sebelumnya, aplikasi Al Patient Navigator Pro bertransisi dari arsitektur monolitik tradisional (React ke Express seadanya) menuju sebuah Sistem Terdistribusi Multi-Agen Berbasis Ruang Obrolan yang memanfaatkan infrastruktur Band Platform.

Dalam arsitektur baru ini, beban kognitif sistem dipisahkan secara tegas: Frontend React menangani pengalaman antarmuka pengguna sekelas ChatGPT/Gemini, Backend Express.js mengelola gerbang keamanan pengguna serta otorisasi token sesi, sedangkan Agen Python berbasis Band SDK mengeksekusi logika klinis medis secara mandiri menggunakan pola Reasoning & Acting (ReAct).

## 2. Pemetaan Komprehensif Folder & Fungsi File
Berikut adalah cetak biru susunan direktori proyek `ai-patient-navigator-pro/`. Setiap file memiliki peran terisolasi (Separation of Concerns) untuk memastikan stabilitas saat pengujian skala besar.

*Al Patient Navigator Pro - Blueprints 1*

| Jalur File / Folder | Komponen | Fungsi Utama & Tanggung Jawab dalam Sistem |
| :--- | :--- | :--- |
| `docs/engineering.md` | DOCS | Berisi spesifikasi teknis arsitektur, aturan standar penulisan kode, dan skema database untuk mencegah regresi logika. |
| `docs/api_contracts.md` | DOCS | Mencatat perjanjian format pertukaran data (JSON Payload) yang sah antara Frontend, Gateway, dan Agen Al. |
| `frontend/src/utils/auth.js` | FRONTEND | Mengelola penyimpanan, validasi, dan pembongkaran JSON Web Token (JWT) di dalam enkapsulasi LocalStorage. |
| `frontend/src/pages/Auth.jsx` | FRONTEND | Halaman terpadu untuk pendaftaran akun (Sign Up) dan autentikasi masuk (Login) dengan penanganan kesalahan dinamis. |
| `frontend/src/pages/MainChat.jsx` | FRONTEND | Ruang obrolan utama interaktif yang terhubung langsung ke Human API Band Platform dengan rendering kartu rekomendasi medis. |
| `frontend/sIC/components/` | FRONTEND | Modul antarmuka kecil yang bisa digunakan berulang kali: HamburgerMenu untuk navigasi, SidebarHistory untuk riwayat obrolan, dan ChatBubble untuk perataan pesan. |
| `backend-api/server.js` | BACKEND | Pintu gerbang utama server Node.js. Menangani inisialisasi Express, koneksi database, dan manajemen kebijakan CORS. |
| `backend-api/models/User.js` | BACKEND | Skema database untuk menyimpan kredensial user, koordinat default pasien, serta password yang telah diamankan via bcrypt hashing. |
| `backend-api/models/ChatHistory.js` | BACKEND | Skema penyimpanan riwayat obrolan yang mencatat relasi antara user_id dengan token room_id unik dari platform Band. |
| `backend-api/middlewares/` | BACKEND | Menampung authMiddleware.js untuk mengecek dan memverifikasi token JWT pada setiap rute API yang bersifat privat. |
| `agents/triage_agent.py` | AGENT AI | Otak utama kecerdasan buatan. Menggunakan Python dan Band SDK untuk terhubung secara asinkron ke server WebSocket Band Platform. |
| `agents/tools/geo_routing.py` | AGENT AI | Fungsi eksternal (Tool) berbasis matematika murni untuk menghitung jarak rumah sakit menggunakan formula geometri Haversine. |
| `agents/tools/insurance.py` | AGENT AI | Fungsi eksternal (Tool) untuk mencocokkan status asuransi (BPJS/Mandiri) klinik terhadap profil asuransi pasien di database. |

*Al Patient Navigator Pro - Blueprints 2*

## 3. Alur Kerja Detil Sistem (End-to-End Workflow)

### A. Alur Autentikasi Pengguna & Sesi (Stateful Session Management)
Untuk memenuhi standar fungsionalitas sekelas ChatGPT atau Gemini, sistem mengimplementasikan manajemen token berbasis waktu yang efisien. Alurnya berjalan sebagai berikut:
1. **Fase Inisiasi:** Pengguna melakukan pendaftaran melalui `Auth.jsx`. Data dikirim ke `backend-api`, password diamankan menggunakan enkripsi salt bcrypt, dan disimpan ke database.
2. **Penerbitan Kunci (Login):** Saat pengguna berhasil masuk, server Node.js menerbitkan JSON Web Token (JWT) dengan masa berlaku tepat 7 hari. Token ini dikirim ke Frontend dan disimpan di LocalStorage.
3. **Siklus Bypass (Auto-Login):** Setiap kali aplikasi dibuka, fungsi di `utils/auth.js` membaca token tersebut. Jika token ada dan masa berlaku belum melewati 7 hari, pengguna langsung dilempar ke menu utama `MainChat.jsx` tanpa harus melihat halaman login. Jika sudah lewat dari 7 hari, sesi dianggap hangus dan sistem memaksa pengguna melakukan autentikasi ulang.

#### Antisipasi Kegagalan Sesi Kritis
Jika masa berlaku 7 hari token JWT habis tepat di tengah-tengah obrolan darurat, sistem Express akan menolak pesan dengan kode kesalahan 401 Unauthorized. Solusi sistemiknya adalah Frontend akan menyimpan draf pesan darurat tersebut di memori lokal sementara, memunculkan modal pengisian sandi kilat, dan mengirim ulang pesan darurat secara otomatis begitu token baru terbit.

### B. Alur Obrolan Triase & Interaksi Multi-Agen
Ketika pengguna berhasil masuk ke halaman utama obrolan dan mengetikkan keluhan medis, koordinasi data terdistribusi mulai berjalan:
* **Frontend ke Platform Band:** Pesan pasien dikirim menggunakan Human API Band Platform (`/v1/me/chats/{id}/messages`). Pengguna manusia memiliki hak akses penuh untuk melihat seluruh linimasa pesan tanpa filtrasi mention.

*Al Patient Navigator Pro - Blueprints 3*

* **Platform Band ke Agen Python:** Server Band menangkap pesan tersebut dan memancarkannya melalui protokol WebSocket ke agen Python kita yang sedang aktif mendengarkan di latar belakang. Karena aturan isolasi konteks Band, agen hanya akan memproses jika namanya dipanggil secara eksplisit (Mention-Based Visibility).
* **Proses Berpikir Agen (LangGraph Loop):** File `triage_agent.py` menangkap obrolan, mengamankan 6 riwayat pesan terakhir (slicing history) untuk mencegah pembengkakan memori, dan menyerahkan teks ke model Llama 3.3 melalui Groq API yang dipaksa mengembalikan objek JSON murni.

### C. Alur Penentuan Rute Fasilitas Medis & Rumah Sakit
Bagian ini menjelaskan bagaimana data dialirkan secara kondisional berdasarkan kesimpulan klinis dari otak Al:
1. Jika Al mengembalikan status INCOMPLETE, agen langsung membalas berupa satu pertanyaan tajam ke ruang obrolan Band tanpa melibatkan fungsi operasional geografis.
2. Jika Al mengembalikan status COMPLETE dengan tingkat urgensi Low serta menyertakan rekomendasi obat bebas (OTC), sistem mengaktifkan logika Self-Care Bypass. Agen tidak akan mencari rumah sakit di `db.json`, melainkan langsung memberikan instruksi perawatan mandiri di apotek terdekat guna menghemat Token API dan sumber daya komputasi.
3. Jika urgensi berstatus Medium atau High, agen akan mengeksekusi alat `tools/geo_routing.py` untuk memfilter rumah sakit yang memiliki spesialisasi yang cocok dari database `data/db.json`.
4. Jika spesialisasi kosong di area tersebut, fungsi Smart Fallback akan berjalan di dalam skrip Python untuk otomatis mengalihkan rute ke Instalasi Gawat Darurat (IGD) atau Layanan Umum terdekat.
5. Data hasil sortir jarak diteruskan ke `tools/insurance.py` untuk diverifikasi kepatuhan finansialnya, dibungkus menjadi sebuah data terstruktur, lalu ditembak balik ke platform Band untuk ditampilkan di layar pasien dalam bentuk kartu komponen React yang elegan.

## 4. Dokumen Riwayat Masalah (QA Logs) & Solusi Teknikal
Selama proses pengembangan berkala, sistem sempat mengalami beberapa kegagalan kritis. Berikut adalah dokumentasi penyelesaian masalah demi menjaga integritas aplikasi saat demonstrasi:

*Al Patient Navigator Pro - Blueprints 4*

| ID Masalah & Gejala | Akar Masalah Utama (Root Cause) | Solusi Sistemik yang Diimplementasikan |
| :--- | :--- | :--- |
| **Error 400: Model Decommissioned**<br>Server Al macet total saat mengirim keluhan. | Penyedia API Groq mematikan model lama secara sepihak (seperti mixtral-8x7b dan llama3-70b-8192) untuk efisiensi infrastruktur mereka. | Melakukan audit dokumentasi model aktif Groq, memperbarui variabel `AI_MODEL` di file konfigurasi menjadi model produksi terbaru: `llama-3.3-70b-versatile`. |
| **The Infinite Question Loop**<br>Al terus mengulang pertanyaan meski pasien sudah minta obat. | Instruksi prompt awal terlalu kaku, mewajibkan Al mengumpulkan detail klinis lengkap tanpa opsi penanganan untuk pasien yang tidak kooperatif atau menyerah. | Menyuntikkan aturan logika Anti-Loop pada prompt sistem. Jika pengguna merespons dengan kata samar/marah, Al dipaksa mengubah status menjadi COMPLETE dan mengalihkan ke Dokter Umum. |
| **Crash: processOpsRouting Is Not Defined**<br>Aplikasi melempar error merah pasca menjawab durasi sakit. | Terjadi kelalaian saat proses penyuntingan kode massal di backend Node.js lama, menyebabkan baris deklarasi perintah import terhapus secara tidak sengaja. | Melakukan restorasi dan penulisan ulang deklarasi jalur modul di baris paling atas file arsitektur orkestrator agen. |
| **Luka Kecil Dipaksa Rujuk Ke RSUD**<br>Kasus goresan ringan mendapatkan rute ambulans gawat darurat. | Sistem lama langsung mengeksekusi pencarian rumah sakit begitu status bernilai sukses, tanpa menyaring terlebih dahulu tingkat keparahan penyakit pasien. | Membangun gerbang logika penyekatan (Intercept Logic). Jika status sukses namun urgensi rendah dan ada obat OTC, rute pencarian RS langsung dihentikan dan UI diarahkan ke Apotek. |

## 5. Panduan Pelaksanaan Langkah-Demi-Langkah (Roadmap)
Untuk memastikan pengerjaan berjalan teratur dan terhindar dari tumpang tindih fungsi, tim pengembang wajib mengikuti empat fase eksekusi berikut:

**Fase 1: Implementasi Gerbang Keamanan Pengguna (Estimasi: Selesai)**
Fokus pada `backend-api/`. Selesaikan rute registrasi dan login di Express. Pastikan token JWT terbit dengan benar dengan waktu kedaluwarsa 7 hari, dan uji coba penyimpanan token di dalam struktur penyimpanan lokal browser.

*Al Patient Navigator Pro - Blueprints 5*

**Fase 2: Pembuatan Desain Ul Kompatibel Gemini (Estimasi: Berjalan)**
Fokus pada `frontend/`. Rancang komponen `HamburgerMenu` untuk mengunci riwayat obrolan masa lalu, bangun fungsi interseptor pada Axios untuk menyuntikkan header JWT secara otomatis, dan buat animasi gelembung titik tiga saat memproses data obrolan.

**Fase 3: Pemindahan Logika Medis ke Python & Band SDK**
Fokus pada folder `agents/`. Ambil spesifikasi instruksi prompt teruji dari file lama, konversikan menjadi struktur fungsi Python menggunakan `LangGraphAdapter`. Daftarkan ID UUID eksternal agen ke dashboard web `band.ai` dan hubungkan koneksi WebSocket-nya.

**Fase 4: Integrasi Alat Pembantu Agen (Tools Deployment)**
Selesaikan penulisan kode pada folder `agents/tools/`. Hubungkan file `geo_routing.py` agar mampu mengurai file database `data/db.json` dengan tepat, jalankan simulasi pengujian QA komprehensif, dan sistem siap dipresentasikan di hadapan juri.

*Al Patient Navigator Pro - Blueprints 6*

---

# BAGIAN 2: RANCANGAN AWAL & ANALISIS DAMPAK SOLUSI

**RANCANGAN AWAL & ANALISIS DAMPAK SOLUSI**
**Al Patient Navigator Pro: Mentransformasi Krisis Triase Kesehatan Melalui Sistem Multi-Agen Terdistribusi**
**Kategori:** Dokumen Rancangan Sistem & Desain Produk
**Target Platform:** Band Ecosystem & Web Apps

## 1. Pernyataan Masalah Tradisional (The Problem Statement)
Sistem pelayanan kesehatan primer di klinik umum maupun rumah sakit saat ini menghadapi masalah struktural yang masif pada fase pra-kedatangan pasien (pre-admission phase). Ketidakseimbangan informasi menciptakan inefisiensi yang merugikan dua aktor utama: Pasien dan Fasilitas Kesehatan (Faskes).

### A. Titik SAKIT (Pain Points) dari Sisi Pasien
* **Asimetri Informasi Medis & Kepanikan:** Pasien awam tidak memiliki kapasitas klinis untuk mendiagnosis tingkat urgensi penyakitnya sendiri. Gejala ringan (seperti luka gores dangkal) sering memicu kepanikan berlebih, sementara gejala fatal (seperti sumbatan pembuluh darah samar) sering diabaikan.
* **Inefisiensi Alokasi Waktu & Geografis:** Pasien cenderung mendatangi Rumah Sakit Umum Pusat (RSUD) besar yang memiliki antrean berjam-jam hanya untuk keluhan fungsional yang sebenarnya bisa diselesaikan dalam 10 menit di klinik pratama terdekat.
* **Buta Regulasi Finansial & Asuransi:** Informasi mengenai apakah suatu tindakan medis atau klinik tertentu mendukung jaminan kesehatan nasional (BPJS) atau asuransi swasta sering kali baru diketahui pasien saat tiba di meja kasir, memicu risiko penolakan atau tagihan mandiri tak terduga (financial shock).

### B. Titik SAKIT (Pain Points) dari Sisi Rumah Sakit & Klinik
* **Penumpukan di Meja Triase IGD (Overburdened Triage Desk):** Tenaga perawat atau staf administrasi faskes menghabiskan waktu produktif yang sangat berharga untuk menyaring data awal pasien secara manual yang datang tanpa janji temu terstruktur.
* **Misalokasi Sumber Daya Medis (Resource Misallocation):** Unit Gawat Darurat (IGD) sering kali penuh sesak oleh kasus-kasus non-darurat (kategori ESI 4 atau 5 seperti flu ringan/luka lecet), sehingga menghambat respons penanganan pasien kritis yang mengancam nyawa (ESI 1 atau 2).
* **Kehilangan Pendapatan Potensial Klinik Spesialis:** Klinik spesialis swasta yang memiliki kapasitas kosong sering tidak dikunjungi karena pasien tidak mengetahui keberadaan spesialisasi tersebut di area lokal mereka.

## 2. Arsitektur Solusi Terintegrasi (The Multi-Agent Solution)
Al Patient Navigator Pro hadir untuk meruntuhkan tembok silos informasi ini sebelum pasien menginjakkan kaki di luar rumah. Menggunakan infrastruktur terdistribusi **Band Platform**, aplikasi ini menempatkan tiga agen pintar otonom yang bekerja bersama dalam satu koridor obrolan:

*Al Patient Navigator Pro - Dokumen Rancangan Awal 1*

| Nama Agen Digital | Logika Internal & Mesin Penggerak | Dampak Langsung pada Masalah |
| :--- | :--- | :--- |
| **Triage & Clarification Agent** | Menggunakan model LLM canggih (Llama 3.3 70B Versatile) dengan aturan ketat ESI (Emergency Severity Index). Dilengkapi mekanisme Anti-Loop interaktif. | Menghilangkan panik pasien. Menggali keluhan secara manusiawi dan menetapkan urgensi klinis (Low/Medium/High) serta spesialis yang tepat secara objektif. |
| **Geo-Routing & Operations Agent** | Mengintegrasikan koordinat GPS real-time browser pengguna dengan kalkulasi matematis Haversine Formula terhadap database klinik lokal (`db.json`). | Menghentikan penumpukan pasien di RSUD besar. Menyebarkan beban lalu lintas pasien ke klinik-klinik terdekat yang memiliki slot kosong secara seimbang. |
| **Insurance & Finance Agent** | Melakukan validasi skema asuransi pasien terhadap aturan kepatuhan administrasi finansial rumah sakit tujuan. | Mencegah kejutan finansial di kasir. Pasien mengetahui hak cakupan BPJS atau kewajiban bayar mandiri semenjak di dalam ruang obrolan. |

## 3. Alur Kerja Sistem Lintas Aktor (System Workflow Matrix)
Desain operasional aplikasi diatur secara ketat berdasarkan status interaksi untuk memberikan pengalaman sekelas aplikasi Gemini/ChatGPT dengan ketegasan sistem medis profesional:

### A. Workflow Skenario Pasien (The Patient Journey)
1. **Fase Otentikasi Aman:** Pasien melakukan registrasi akun atau masuk. Sistem menerbitkan Token JWT berdurasi 7 hari. Selama 7 hari ke depan, pasien tidak perlu mengetik password lagi saat membuka aplikasi (Auto-Bypass) untuk mempercepat pelaporan gejala.
2. **Siklus Interogasi Klinis:** Pasien mengetik keluhan awal. Jika data samar ("sakit bre"), Al Triage memicu status INCOMPLETE untuk bertanya balik secara empatik. Jika pasien menolak menjawab secara detail namun ada tanda bahaya fatal (Red Flags), Al mendeteksi darurat seketika.
3. **Bypass Perawatan Mandiri (Self-Care Route):** Jika keluhan dinilai sangat ringan (luka lecet permukaan), sistem memotong rute operasi (Bypass), melarang pasien ke rumah sakit, dan menyarankan obat bebas (OTC) di apotek terdekat.
4. **Penerimaan Kartu Rujukan:** Untuk kasus sedang/berat, sistem menampilkan 3 kartu klinik terbaik dengan indikasi jarak km, perkiraan antrean, dan kejelasan asuransi. Pasien menekan "Pilih Klinik Ini" dan data terkirim langsung ke meja perawat faskes tujuan.

### B. Workflow Skenario Fasilitas Kesehatan (The Clinic Board Dashboard)
1. **Penerimaan Pra-Registrasi Real-Time:** Ketika pasien menekan tombol di aplikasi, data masuk ke `backend-api` dan langsung memancarkan notifikasi di halaman `Dashboard.jsx` milik klinik.
2. **Triase Otomatis Sebelum Pasien Tiba:** Layar monitor perawat akan menampilkan nama pasien, ringkasan gejala hasil obrolan Al, tingkat urgensi (Merah/Kuning/Hijau), serta status asuransi yang divalidasi.

*Al Patient Navigator Pro - Dokumen Rancangan Awal 2*

3. **Optimalisasi Antrean Internal:** Pihak faskes dapat langsung menyiapkan berkas medis, menugaskan dokter spesialis yang tepat, atau mengosongkan tempat tidur IGD jika pasien berkategori High Urgency sedang dalam perjalanan menuju lokasi mereka.

### Analisis Dampak Bisnis & Efisiensi Operasional (ROI)
Dengan mengimplementasikan sistem terdistribusi ini, beban kerja administratif administrasi pra-pendaftaran rumah sakit berkurang hingga 45%, waktu tunggu di ruang tunggu faskes menurun drastis, dan yang paling utama: menurunkan angka kematian akibat keterlambatan triase gawat darurat (Zero False Negatives pada Red Flags).

*Al Patient Navigator Pro - Dokumen Rancangan Awal 3*