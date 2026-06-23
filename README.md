# Nara

<p align="center">
  <img src="public/logo.png" alt="Nara" width="220"/>
</p>

Nara adalah asisten kerja berbasis WhatsApp yang membantu owner dan tim tetap ingat pekerjaan penting, jadwal, tindak lanjut, dan rangkuman percakapan kerja.

Tujuannya sederhana: orang tetap bisa bekerja dari WhatsApp seperti biasa, sementara Nara membantu mencatat hal penting, membuat pengingat, menyiapkan rangkuman, dan menjaga agar keputusan atau tugas tidak hilang di tengah chat yang ramai.

> Status: produk masih dalam tahap pengembangan menuju penggunaan internal.

## Untuk Apa

Nara dibuat untuk membantu pekerjaan operasional yang sering tercecer karena terlalu banyak percakapan, grup, dan keputusan kecil setiap hari.

Nara ditujukan untuk membantu:

- mengingatkan jadwal hari ini dan besok
- mencatat tugas dari percakapan
- membuat dan mengelola pengingat
- merangkum percakapan grup kerja
- menyimpan konteks penting tentang klien, pekerjaan, dan kebiasaan kerja
- meminta persetujuan sebelum menjalankan tindakan yang berisiko
- memberi admin tempat untuk memantau kondisi sistem

## Cara Kerja Produk

Nara punya beberapa permukaan utama:

- **Nara Bot di WhatsApp** sebagai cara utama untuk berbicara dengan asisten.
- **Aplikasi mobile** untuk login, melihat tugas, mengatur pengingat, mengelola akses Nara Bot, dan konfigurasi manual.
- **Web admin lokal** untuk pengelolaan server, pengguna, akses WhatsApp, backup, log, dan kondisi sistem.
- **Penyimpanan data Nara** sebagai tempat tugas, pengingat, konteks, dan riwayat kerja dijaga tetap rapi.

Nara Bot tidak hanya menjawab chat. Saat pengguna meminta sesuatu, Nara dapat menggunakan alat yang tersedia untuk membuat tugas, mengatur pengingat, membaca konteks, atau membuat permintaan persetujuan. Data tetap disimpan di sistem Nara agar pekerjaan bisa dilacak dan tidak bergantung pada percakapan chat saja.

## Arah Produk

Prioritas utama Nara adalah menjadi asisten kerja yang praktis untuk penggunaan harian:

1. WhatsApp menjadi pintu masuk utama.
2. Tugas dan pengingat bisa dibuat lewat percakapan maupun aplikasi.
3. Rangkuman grup kerja bisa membantu owner mengikuti diskusi yang terlewat.
4. Setiap tindakan penting tetap punya izin, catatan, dan riwayat.
5. Sistem tetap bisa dijalankan di komputer kantor sebelum nanti diputuskan apakah perlu dipindah ke server lain.

## Status Saat Ini

Yang sudah berjalan dalam repo ini:

- login pengguna di aplikasi mobile
- tugas dan pengingat per pengguna
- pengingat otomatis dari sistem Nara
- fallback notifikasi lokal di Android
- permintaan persetujuan untuk tindakan Nara Bot
- pengelolaan akses Nara Bot dari admin
- sinkronisasi akses WhatsApp untuk nomor yang diizinkan
- backup terjadwal dan verifikasi restore aman
- pengecekan kondisi server dan layanan penting

Yang masih menjadi prioritas berikutnya:

- nomor WhatsApp khusus untuk Nara Bot
- rangkuman percakapan grup
- penguatan konteks grup dan izin akses
- penyempurnaan pengalaman edit pengingat di mobile
- fallback delivery untuk laporan

## Dokumentasi Teknis

Detail teknis, roadmap, arsitektur, runbook server, dan catatan implementasi disimpan di folder dokumentasi:

- [Architecture](docs/architecture.md)
- [Roadmap](docs/ROADMAP.md)
- [Catatan Integrasi Sistem](docs/backend-integration.md)
- [Mobile App Notes](docs/mobile-app.md)
- [Akses Jarak Jauh](docs/deployment/cloudflare-tunnel.md)
- [Windows Server Runbook](ops/windows/README.md)

Folder `docs/` adalah sumber utama untuk pekerjaan lanjutan. Root README ini sengaja dibuat ringkas agar tujuan produk tetap mudah dipahami tanpa detail internal yang terlalu panjang.

## Lisensi

MIT
