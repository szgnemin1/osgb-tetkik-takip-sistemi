# OSGB Tetkik Takip Sistemi

**OSGB Pro**, Ortak Sağlık Güvenlik Birimleri (OSGB) için geliştirilmiş modern, hızlı ve kapsamlı bir masaüstü uygulamasıdır. İşe giriş muayeneleri, periyodik tetkikler, sevk yönetimi ve finansal takibi tek bir platformda birleştirir.

![OSGB Pro Screenshot](public/vite.svg)

## 🚀 Özellikler

### 🏥 Personel ve Sevk Yönetimi
*   **Firma Bazlı Takip:** Firmaların tehlike sınıflarına göre (Az Tehlikeli, Tehlikeli, Çok Tehlikeli) otomatik sınıflandırma.
*   **Hızlı Sevk Oluşturma:** Firma seçildiğinde anlaşmalı tetkiklerin otomatik yüklenmesi.
*   **Kurum Entegrasyonu:** Personelin sevk edileceği laboratuvar veya görüntüleme merkezinin seçimi ve zorunlu kurum ataması.

### 💰 Finans ve Muhasebe
*   **Gelir/Gider Takibi:** Kasa giriş-çıkış işlemleri.
*   **Nakit vs Cari:** Firmaların ödeme yöntemine göre (Nakit/Fatura) sevklerin sınıflandırılması.
*   **Maliyet Analizi:** Tetkiklerin satış fiyatı ve OSGB'ye maliyetinin karşılaştırmalı takibi.
*   **Kâr/Zarar Göstergesi:** Anlık tahmini kâr hesabı.

### 📄 Raporlama (Z Raporu)
*   **A4 Baskı Formatı:** Yazıcı dostu, profesyonel tasarım.
*   **Gün Sonu/Haftalık/Aylık Rapor:** Periyodik faaliyet raporları.
*   **İmzalı Teslimat:** Kasa devir işlemleri için imza alanları.

### ⚙️ Gelişmiş Ayarlar
*   **Excel İle Toplu Yükleme:** Yüzlerce firma ve personel kaydını Excel şablonu ile saniyeler içinde içeri aktarma.
*   **Logo Özelleştirme:** Firma logosunun sisteme ve raporlara eklenmesi.
*   **Dinamik Parametreler:** EKG zorunluluk yaşı, tetkik fiyatları ve maliyetlerin yönetimi.
*   **Veri Yedekleme:** Tüm veriler yerel olarak (Local Storage/JSON) güvenle saklanır.

## 🛠 Kullanılan Teknolojiler

Bu proje, modern web teknolojilerinin gücünü masaüstüne taşımak için aşağıdaki araçlarla geliştirilmiştir:

*   **[Electron.js](https://www.electronjs.org/):** Çapraz platform masaüstü uygulama motoru.
*   **[React](https://react.dev/):** Kullanıcı arayüzü kütüphanesi.
*   **[TypeScript](https://www.typescriptlang.org/):** Tip güvenliği ve ölçeklenebilir kod yapısı.
*   **[Tailwind CSS](https://tailwindcss.com/):** Hızlı ve modern UI tasarımı.
*   **[Vite](https://vitejs.dev/):** Ultra hızlı frontend derleme aracı.
*   **Electron Store:** Veri kalıcılığı ve yerel depolama.
*   **Google Gemini AI:** Tetkik sonuçlarının yapay zeka destekli ön analizi.

## 📦 Kurulum ve Çalıştırma

Projeyi bilgisayarınıza klonladıktan sonra aşağıdaki adımları izleyerek çalıştırabilirsiniz:

### 1. Bağımlılıkları Yükleyin
Terminalde proje klasörüne giderek gerekli paketleri yükleyin:

```bash
npm install
```

### 2. Geliştirme Modunda Çalıştırın
Hem React arayüzünü hem de Electron penceresini aynı anda başlatmak için:

```bash
npm run electron:dev
```

### 3. Uygulamayı Derleyin (Build)
Uygulamayı dağıtıma hazır `.exe` (Windows) veya `.dmg` (macOS) formatına getirmek için:

```bash
npm run dist
```
Derlenen dosyalar `dist-electron` klasöründe yer alacaktır.

## 🤝 Katkıda Bulunma

1.  Bu projeyi Fork'layın.
2.  Yeni bir özellik dalı oluşturun (`git checkout -b feature/YeniOzellik`).
3.  Değişikliklerinizi Commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalınızı Push'layın (`git push origin feature/YeniOzellik`).
5.  Bir Pull Request oluşturun.

## 📄 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakabilirsiniz.

---
*Geliştirici Notu: Bu uygulama OSGB süreçlerini dijitalleştirmek amacıyla tasarlanmıştır.*
