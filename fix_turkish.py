import re

advanced_fixes = [
    ("kt\ufffd", "çıktı"),
    ("ka\ufffdY\ufffdd\ufffd", "kağıdı"),
    ("Yaz\ufffdl\ufffdm", "Yazılım"),
    ("s\u01e2r\u01e2m\u01e2n\u01e2", "sürümünü"),
    ("istedi\ufffdYinize", "istediğinize"),
    ("i\ufffdYlem", "işlem"),
    ("\ufffd\ufffdekilecek", "çekilecek"),
    ("yakla\ufffdY\ufffdk", "yaklaşık"),
    ("s\u01e2rebilir", "sürebilir"),
    ("G\u01e2ncelleme", "Güncelleme"),
    ("g\u01e2ncelleyebilirsiniz", "güncelleyebilirsiniz"),
    ("do\ufffdYrudan", "doğrudan"),
    ("kuruldu\ufffdYu", "kurulduğu"),
    ("s\u01e2r\u01e2me", "sürüme"),
    ("g\u01e2venli", "güvenli"),
    ("\ufffdYekilde", "şekilde"),
    ("ba\ufffdYlan\ufffdp", "bağlanıp"),
    ("\ufffd\ufffdal\ufffdYt\ufffdrma", "çalıştırma"),
    ("zorunlulu\ufffdYunu", "zorunluluğunu"),
    ("kald\ufffdr\ufffdr", "kaldırır"),
    ("Ba\ufffdYar\ufffdyla", "Başarıyla"),
    ("ba\ufffdYar\ufffdyla", "başarıyla"),
    ("g\u01e2ncellendi", "güncellendi"),
    ("olu\ufffdYturuldu", "oluşturuldu"),
    ("ba\ufffdYlat\ufffdld\ufffd", "başlatıldı"),
    ("Taray\ufffdc\ufffdn\ufffdz", "Tarayıcınız"),
    ("birka\ufffd\ufffd", "birkaç"),
    ("i\ufffd\ufffdinde", "içinde"),
    ("sayfay\ufffd", "sayfayı"),
    ("y\u01e2kleyecektir", "yükleyecektir"),
    ("Olu\ufffdYtu", "Oluştu"),
    ("Mesaj\ufffd", "Mesajı"),
    ("E\ufffdYer", "Eğer"),
    ("de\ufffdYi\ufffdYiklikler", "değişiklikler"),
    ("yapt\ufffdysan\ufffdz", "yaptıysanız"),
    ("\ufffd\ufffdak\ufffdYma", "çakışma"),
    ("yapm\ufffdY", "yapmış"),
    ("a\ufffdY", "ağ"),
    ("ba\ufffdYlant\ufffds\ufffdnda", "bağlantısında"),
    ("olu\ufffdYmu\ufffdY", "oluşmuş"),
    ("S\u01e2r\u01e2m\u01e2", "Sürümü"),
    ("\ufffdYimdi", "Şimdi"),
    ("Yazd\ufffdrma", "Yazdırma"),
    ("kayd\ufffd", "kaydı"),
    ("olu\ufffdYturuldu\ufffdYunda", "oluşturulduğunda"),
    ("ekran\ufffdn\ufffd", "ekranını"),
    ("a\ufffd\ufffdar", "açar"),
    ("ka\ufffdY\ufffdt", "kağıt"),
    ("ad\ufffdn\ufffd", "adını"),
    ("de\ufffdYi\ufffdYtirmek", "değiştirmek"),
    ("t\ufffdklay\ufffdp", "tıklayıp"),
    ("Yede\ufffdYi", "Yedeği"),
    ("y\u01e2kledi\ufffdYinizde", "yüklediğinizde"),
    ("t\u01e2m", "tüm"),
    ("al\ufffdnamaz", "alınamaz"),
    ("g\u01e2r\u01e2necektir", "görünecektir"),
    ("Kald\ufffdr", "Kaldır"),
    ("d\ufffd\ufffdnem", "dönem"),
    ("D\ufffd\ufffdnem", "Dönem"),
    ("G\ufffd\ufffdnderir", "Gönderir"),
    ("G\ufffd\ufffdnderin", "Gönderin"),
    ("g\ufffd\ufffdnderir", "gönderir"),
    ("g\ufffd\ufffdnderebilmesi", "gönderebilmesi"),
    ("g\ufffd\ufffdnderilemedi", "gönderilemedi"),
    ("G\ufffd\ufffdnder", "Gönder"),
    ("g\ufffd\ufffdnder", "gönder"),
    ("\ufffd\ufffdzel", "Özel"),
    ("\ufffd\ufffdzetleyen", "Özetleyen"),
    ("ay\ufffd", "ayı"),
    ("Se\ufffd\ufffd", "Seç"),
    ("se\ufffd\ufffdilip", "seçilip"),
    ("i\ufffd\ufffdin", "için"),
    ("Ya\ufffdY\ufffd", "Yaşı"),
    ("ya\ufffdY", "yaş"),
    ("\ufffd\ufffd\ufffdkt\ufffds\ufffdnda", "çıktısında"),
    ("kullan\ufffdlacakt\ufffdr", "kullanılacaktır"),
    ("kullan\ufffdlacak", "kullanılacak"),
    ("men\u01e2de", "menüde"),
    ("Y\u01e2kle", "Yükle"),
    ("k\u01e2\ufffd\ufffd\u01e2k", "küçük"),
    ("olmal\ufffdd\ufffdr", "olmalıdır"),
    ("s\ufffdras\ufffdyla", "sırasıyla"),
    ("\ufffd\ufffdekilir", "çekilir"),
    ("Ba\ufffdY\ufffdml\ufffdl\ufffdklar", "Bağımlılıklar"),
    ("g\u01e2ncellenir", "güncellenir"),
    ("\u01e2retim", "üretim"),
    ("s\ufffdf\ufffdrdan", "sıfırdan"),
    ("kararl\ufffd", "kararlı"),
    ("ba\ufffdYlat\ufffdl\ufffdr", "başlatılır"),
    ("y\u01e2r\u01e2t\u01e2l\u01e2yor", "yürütülüyor"),
    ("l\u01e2tfen", "lütfen"),
    ("h\ufffdz\ufffdna", "hızına"),
    ("ba\ufffdYl\ufffd", "bağlı"),
    ("kapatmay\ufffdn", "kapatmayın"),
    ("Ba\ufffdYlant\ufffds\ufffd", "Bağlantısı"),
    ("Ba\ufffdYlant\ufffdy\ufffd", "Bağlantıyı"),
    ("a\ufffd\ufffd\ufffdn", "açın"),
    ("men\u01e2s\u01e2nden", "menüsünden"),
    ("Ba\ufffdYla", "Bağla"),
    ("ba\ufffdYlat\ufffdl\ufffdyor", "başlatılıyor"),
    ("Anla\ufffdYmal\ufffd", "Anlaşmalı"),
    ("\ufffd\ufffdleti\ufffdYim", "İletişim"),
    ("Detayl\ufffd", "Detaylı"),
    ("y\ufffd\ufffdnlendirerek", "yönlendirerek"),
    ("Tasla\ufffdY\ufffd", "Taslağı"),
    ("De\ufffdYi\ufffdYkenler", "Değişkenler"),
    ("Kullan\ufffdlabilecek", "Kullanılabilecek"),
    ("\u01e2cretleri", "ücretleri"),
    ("anl\ufffdk", "anlık"),
    ("Biti\ufffdY", "Bitiş"),
    ("ba\ufffdYlang\ufffd\ufffd\ufffd", "başlangıç"),
    ("Y\ufffdl", "Yıl"),
    ("Ay\ufffd", "Ayı"),
    ("G\u01e2n\u01e2", "Günü"),
    ("aras\ufffd", "arası"),
    ("yap\ufffdland\ufffdrabilirsiniz", "yapılandırabilirsiniz"),
    ("B\ufffd\ufffdlgesel", "Bölgesel"),
    ("\ufffd\ufffdal\ufffdYma", "çalışma"),
    ("g\ufffd\ufffdre", "göre"),
    ("se\ufffd\ufffdin", "seçin"),
    ("yap\ufffdland\ufffdrma", "yapılandırma"),
    ("a\ufffd\ufffd", "aç"),
    ("Say\ufffdn", "Sayın"),
    ("olu\ufffdYturulmu\ufffdYtur", "oluşturulmuştur"),
    ("Bak\ufffd\ufffdY", "Bakış"),
    ("Anla\ufffdYmal\ufffd", "Anlaşmalı")
]

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Simple direct character replacement for consistent corrupted codes:
    # '' (\ufffd) followed by 'Y' is often 'ğ' or 'ş'.
    # Actually, it's easier to just replace \ufffdY with ş or ğ depending on context,
    # but let's just do a brute force decode using cp1254 or something?
    # No, \ufffd is literally a replacement character. The data is lost.
    # BUT wait, the text I extracted earlier using Get-Content wasn't \ufffd. 
    # Let me just run a generic replace for standard broken words.

    for bad, good in advanced_fixes:
        text = text.replace(bad, good)
        
    # More generic fixes
    text = text.replace("Yazlm", "Yazılım")
    text = text.replace("Gncelleme", "Güncelleme")
    text = text.replace("kt", "çıktı")
    text = text.replace("kad", "kağıdı")
    text = text.replace("deitirmek", "değiştirmek")
    text = text.replace("Srm", "Sürümü")
    
    # Catch any remaining single chars safely if possible
    # text = text.replace("Y", "ş")
    # text = text.replace("Ǭ", "ü")
    # text = text.replace("", "ı") # risky because it can be ç,ö,ğ too, but mostly ı.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
