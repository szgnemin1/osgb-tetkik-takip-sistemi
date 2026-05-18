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

## 🌐 YunoHost Üzerinde Kurulum (yonetim.cankayaosgb.tr/tetkik)

Uygulamayı YunoHost'ta bir "Custom Webapp" (Özel Web Uygulaması) olarak kurmak için aşağıdaki adımları sunucunuzun SSH terminalinde (root veya admin kullanıcısı ile) uygulayın:

### 1. Custom Webapp Kurulumu
YunoHost admin panelinden veya komut satırından yeni bir Custom Webapp oluşturun.
- **Domain:** `yonetim.cankayaosgb.tr`
- **URL Path:** `/tetkik`
- Sizin için YunoHost bir dizin oluşturacaktır (Örn: `/var/www/my_webapp__2`)

### 2. Dosyaları Sunucuya Çekme ve Derleme
SSH üzerinden sunucuya bağlanın ve Custom Webapp'in kurulu olduğu dizine gidin (Örnekteki dizin adını kendi dizininize göre değiştirin):

```bash
# Uygulama dizinine gidin
cd /var/www/my_webapp

# İçindeki varsayılan dosyaları silin (YunoHost'un koyduğu örnek index dosyasını temizler)
rm -rf * 

# Github'dan projeyi indirin (Sonundaki nokta '.' projeyi mevcut klasörün içine çıkarmak içindir)
git clone https://github.com/szgnemin1/osgb-tetkik-takip-sistemi.git .

# Bağımlılıkları yükleyin
npm install

# Projeyi derleyin
npm run build
```

### 3. Uygulamayı 7/24 Çalıştırma (PM2)
```bash
# PM2 sistemi yüklü değilse genel olarak yükleyin
npm install -g pm2

# Uygulamayı başlatın (Varsayılan olarak 3000 portunda çalışır)
pm2 start npm --name "osgb-tetkik" -- start

# Yeniden başlatmalarda otomatik açılması için kaydedin
pm2 save
pm2 startup
```

### 4. NGINX Ayarları
YunoHost NGINX ayar dosyasını düzenleyip trafiği web uygulamanıza (Port 3000) yönlendirmeniz gerekir. Ayar dosyasını açın (Ayar dosyasının adı uygulamanıza göre değişebilir, klasörün içine `ls` ile bakarak doğrusunu bulabilirsiniz):

```bash
nano /etc/nginx/conf.d/yonetim.cankayaosgb.tr.d/my_webapp.conf
```

Dosya içindeki `location /tetkik/` (veya `location /tetkik`) ile başlayan bloğu bulun ve içini proxy yapacak şekilde şu şekilde düzenleyin:

```nginx
location /tetkik/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Yedek geri yükleme gibi büyük JSON dosyaları için limit arttırımı
    client_max_body_size 50M;
    
    # YunoHost'un koyduğu include satırlarına dokunmanıza gerek yok (SSO ayarları vs. kalabilir)
}
```
Ayarları kaydedip çıkın (`CTRL+X`, `Y`, `Enter`) ve Nginx'i yeniden başlatın:
```bash
systemctl restart nginx
```

## 🔄 Sistemi Güncellemek

GitHub'a projenin yeni hali yüklendiğinde, güncellemeyi canlı sunucunuza (YunoHost) entegre etmek için SSH üzerinden uygulama dizinine (Örn: `/var/www/my_webapp`) girerek sırasıyla şu 4 komutu çalıştırmanız yeterlidir:

```bash
# 1. En güncel kodları Github'dan çekin
git pull origin main

# 2. Yeni eklenen bir kütüphane varsa yüklenmesini sağlayın
npm install

# 3. Kodu yayına hazır hale getirmek için derleyin
npm run build

# 4. Arka planda çalışan uygulamayı yeniden başlatın
pm2 restart osgb-tetkik
```

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
