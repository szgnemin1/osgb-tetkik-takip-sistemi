---
marp: true
theme: default
class: lead
backgroundColor: #f0f4f8
---

# Ödeal Device2Device POS & E-Fatura Entegrasyonu
### Yönetici Özeti ve Teknik Plan
**Hazırlayan:** Antigravity AI
**Tarih:** Ekim 2026

---

## 🎯 Projenin Amacı

Mevcut Tetkik/Fatura Takip sistemimizin **Ödeal POS** cihazlarıyla otomatik haberleşmesini sağlamak.

- **Otomasyon:** Cihaza elle tutar girme derdine son.
- **E-Fatura:** Ödeme başarılı anında, sistemdeki müşteri bilgisiyle E-Fatura otomatik kesilir.
- **Hız:** Kasa ve hesaplar anında "Ödendi" statüsüne güncellenir.

---

## 🧩 Sistem Altyapımız Hazır!

Mevcut sisteminizde halihazırda müşterilerin ve işçilerin **TC Kimlik, Ad, Soyad** gibi fatura için zorunlu bilgileri toplanmaktadır. 

Bu sayede ödeme anında personelin fazladan hiçbir bilgi girmesine gerek kalmayacaktır. Satış ekranından "Ödeal ile Öde" butonuna basılması yeterli olacaktır.

---

## 🛠️ Süreç Nasıl İşleyecek? (Geliştirme Adımları)

İşi bana verdiğinizde kodlamayı şu **4 aşamada** gerçekleştireceğim:

### 1. Veritabanı ve Müşteri Eşleştirmesi
Mevcut Prisma/PostgreSQL veritabanımızda zaten tuttuğumuz TC Kimlik Numarası ve adres bilgilerini, Ödeal'ın istediği "Sepet (Basket)" formatına dönüştürecek altyapıyı hazırlayacağım.

---

### 2. Arayüz (Frontend) Entegrasyonu
Ödeme ve Sevk kapatma ekranlarına **"Ödeal POS"** butonu ekleyeceğim. 
Kullanıcı bu butona tıkladığında sistem arka planda ödeme tutarını ve TC numarasını paketleyerek işlemi başlatacak ve ekranda "POS'tan şifre bekleniyor" uyarı animasyonu gösterecek.

---

### 3. Backend ve Cihaz Tetikleme (API)
Node.js sunucumuzda POST /api/v1/basket servisiyle haberleşecek yeni bir köprü kuracağım. Bu köprü sayesinde;
- Sunucumuz, masadaki Ödeal POS cihazını saniyeler içinde **uyandıracak**.
- Tutar cihazın ekranına düşecek.

---

### 4. Geri Bildirim (Webhook) ve Kasa Kapanışı
Ödeal'dan sunucumuza gelecek anlık bildirimleri (Webhook) dinleyecek yeni bir uç nokta oluşturacağım. 
Müşteri POS'ta şifreyi girdiği saniye, Ödeal sunucumuza "İşlem Tamam" diyecek. Ben de o faturayı anında **"ÖDENDİ"** yapıp kasanızı güncelleyeceğim.

---

## 🔑 Başlamak İçin Ne Gerekiyor?

Sizin tarafınızdan sadece şu bilgileri temin etmenizi bekliyorum:
- **API Anahtarları:** Ödeal panelinden alınacak X-ODEAL-MERCHANT-KEY ve SECRET-KEY
- **Cihaz Kodu:** POS cihazınızın içindeki *Cihazlarım* menüsünden alınacak externalDeviceKey

Bu veriler geldiğinde geliştirmeye test ortamında anında başlayabilirim.
