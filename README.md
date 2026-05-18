# OSGB Tetkik Takip Sistemi

**OSGB Pro**, Ortak Sağlık Güvenlik Birimleri (OSGB) için geliştirilmiş modern, hızlı ve kapsamlı bir web tabanlı takip uygulamasıdır. İşe giriş muayeneleri, periyodik tetkikler, sevk yönetimi ve finansal takibi tek bir platformda birleştirir.

## 🚀 Özellikler

### 🏥 Personel ve Sevk Yönetimi
*   **Firma Bazlı Takip:** Firmaların tehlike sınıflarına göre (Az Tehlikeli, Tehlikeli, Çok Tehlikeli) verimli yönetimi.
*   **Hızlı Sevk Oluşturma:** Firma seçildiğinde anlaşmalı tetkiklerin otomatik listelenmesi.
*   **Kurum Entegrasyonu:** Personelin sevk edileceği kurumların seçimi ve zorunlu kurum ataması.

### 💰 Finans ve Muhasebe
*   **Gelir/Gider Takibi:** Kasa giriş-çıkış (tahsilat ve ödeme) işlemleri.
*   **Nakit vs Cari:** Firmaların ödeme yöntemine göre (Nakit/POS/Fatura) tahsilat takibi.
*   **Kâr/Zarar Göstergesi:** O anki hareketlere göre otomatik ciro ve bakiye hesaplamaları.

### 📄 Raporlama (Z Raporu)
*   **Yazıcı Dostu Format (A4):** Raporların ve sevk dökümlerinin yazıcıya uyumlu profesyonel tasarımı.
*   **Gün Sonu Raporu:** İstenen tarih aralığına ve tahsilat tiplerine göre kasa devir işlemi için gün sonu dökümü.

### 🛡️ Güvenlik ve Ayarlar
*   **Güvenli Oturum Yönetimi:** JWT (JSON Web Token), Helmet, Brute-force koruması (Rate Limit) ve Bcrypt şifrelemeyle yetkisiz erişimlere karşı tam koruma.
*   **Dinamik Şifre Güncelleme:** Yönetici şifresinin sistem içerisinden anında güvenle değiştirilebilmesi.
*   **Veri Yedekleme ve Geri Yükleme:** Tek tıkla tüm veritabanının JSON olarak bilgisayara indirilmesi (yedeklenmesi) ve istenildiğinde tekrar sisteme yüklenmesi.
*   **Dinamik Parametreler:** Tetkikler, muayene birimleri, EKG yaş sınırı gibi genel kuralların yapılandırılması.

## 🛠 Kullanılan Teknolojiler

*   **[React](https://react.dev/) & [Vite](https://vitejs.dev/):** Ultra hızlı, modern ve etkileşimli kullanıcı arayüzü.
*   **[Node.js](https://nodejs.org/) & [Express](https://expressjs.com/):** Güçlü ve esnek arka uç (backend) sunucusu.
*   **[TypeScript](https://www.typescriptlang.org/):** Uçtan uca tip güvenliği.
*   **[Tailwind CSS](https://tailwindcss.com/):** Hızlı ve modern UI tasarımı.

## 📦 Kurulum ve 7/24 Canlı Sunucuda Çalıştırma (PM2)

Projeyi kendi sunucunuza **GitHub** üzerinden çekerek (clone) **7/24 kesintisiz şekilde PM2** ile çalıştırmak için aşağıdaki adımları izleyin:

### 1. Projeyi GitHub'dan Çekin
```bash
git clone https://github.com/szgnemin1/osgb-tetkik-takip-sistemi.git
cd osgb-tetkik-takip-sistemi
```

### 2. Gerekli Bağımlılıkları Yükleyin
Sistemin çalışması için gerekli Node.js paketlerini yükleyin:
```bash
npm install
```

### 3. Uygulamayı Derleyin (Build)
Uygulamanızın hem ön yüzünü (React/Vite) hem de arka yüzünü (Server) yayına hazır hale getirin:
```bash
npm run build
```

### 4. PM2 Kurulumu (Eğer sunucunuzda yüklü değilse)
PM2, uygulamanızın çöktüğünde kendini yeniden başlatmasını ve arka planda 7/24 çalışmasını sağlayan bir süreç yöneticisidir:
```bash
npm install -g pm2
```

### 5. Uygulamayı PM2 ile Başlatın
Aşağıdaki komutu kullanarak uygulamanızı PM2 ile arka planda çalışmaya başlatın:
```bash
pm2 start npm --name "osgb-sistemi" -- start
```
*(Alternatif olarak doğrudan build edilmiş backend dosyasını `pm2 start dist/server.cjs --name "osgb-sistemi"` komutu ile de başlatabilirsiniz.)*

### 6. PM2'yi Sistem Başlangıcına Ekleyin (İsteğe Bağlı ama Önerilir)
Sunucu (veya bilgisayar) yeniden başladığında uygulamanın da otomatik başlaması için:
```bash
pm2 startup
pm2 save
```

### Ekstra Komutlar (PM2 Yönetimi)
*   **Uygulama loglarını anlık izlemek için:** `pm2 logs osgb-sistemi`
*   **Uygulamayı durdurmak için:** `pm2 stop osgb-sistemi`
*   **Uygulamayı yeniden başlatmak için:** `pm2 restart osgb-sistemi`
*   **Mevcut PM2 süreçlerini listelemek için:** `pm2 list`

## 🌐 YunoHost & Subpath Kurulumu (yonetim.cankayaosgb.tr/tetkik)

Eğer uygulamanızı YunoHost üzerinde "Custom Webapp" seçeneğiyle ve `/tetkik` gibi bir alt dizinde (subpath) yayınlamak istiyorsanız, sistemdeki **gerekli tüm altyapı güncellemeleri** yapılmıştır.

Sistemi YunoHost ile `yonetim.cankayaosgb.tr/tetkik` adresinde çalıştırmak için:

1. YunoHost Admin panelinden **Custom Webapp** kurun.
2. Domain olarak `yonetim.cankayaosgb.tr`, yol (path) olarak `/tetkik` seçin.
3. Uygulamayı sunucu içinde NGINX'in proxy yapacağı bir portta (Örn: `3000`) çalıştırın. NGINX ayarlarında `proxy_pass http://127.0.0.1:3000;` ayarının yapılı olduğundan emin olun.
4. Yazılım kendi içerisinde `/tetkik` isteklerini ve NGINX stripping (yol silme) kurallarını otomatik tanıyıp api ve arayüz dosyalarını sorunsuz çalıştıracaktır.

## 🤝 Katkıda Bulunma

1.  Bu projeyi Fork'layın.
2.  Yeni bir özellik dalı oluşturun (`git checkout -b feature/YeniOzellik`).
3.  Değişikliklerinizi Commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalınızı Push'layın (`git push origin feature/YeniOzellik`).
5.  Bir Pull Request oluşturun.

## 📄 Lisans

Bu proje **GNU General Public License v3.0** lisansı ile yayınlanmıştır.

```text
Project: OSGB Tetkik Takip Sistemi
Copyright (C) 2026 szgn_emin

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License.
```
