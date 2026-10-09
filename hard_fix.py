import re
with open('components/SettingsView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Strip out ALL odeal states
code = re.sub(r"\s*const \[odealEnabled, setOdealEnabled\] = useState\(settings\.odealEnabled \?\? true\);", "", code)
code = re.sub(r"\s*const \[odealMerchantKey, setOdealMerchantKey\] = useState\(settings\.odealMerchantKey \|\| ''\);", "", code)
code = re.sub(r"\s*const \[odealSecretKey, setOdealSecretKey\] = useState\(settings\.odealSecretKey \|\| ''\);", "", code)
# Strip handleSaveOdealSettings blocks completely
code = re.sub(r"\s*const handleSaveOdealSettings = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\(\"Hata oluştu\.\"\);\s*\}\s*\};", "", code)
code = re.sub(r"\s*const handleSaveOdealSettings = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\(\"Hata olutu\.\"\);\s*\}\s*\};", "", code)
code = re.sub(r"\s*const handleToggleOdealProfile = async \(profileType: 'INTERNAL_BASKET' \| 'EXTERNAL_DEVICE_TO_DEVICE'\) => \{[\s\S]*?alert\(\"İstek gönderilirken hata oluştu\.\"\);\s*\}\s*\};", "", code)

# 2. Add them back ONCE
state_insert = """const [odealDeviceKey, setOdealDeviceKey] = useState(settings.odealDeviceKey || '');
  const [odealEnabled, setOdealEnabled] = useState(settings.odealEnabled ?? true);
  const [odealMerchantKey, setOdealMerchantKey] = useState(settings.odealMerchantKey || '');
  const [odealSecretKey, setOdealSecretKey] = useState(settings.odealSecretKey || '');"""
code = re.sub(r"const \[odealDeviceKey, setOdealDeviceKey\] = useState\(settings\.odealDeviceKey \|\| ''\);", state_insert, code)

func_insert = """  const handleSaveOdealSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        ...settings,
        odealEnabled,
        odealMerchantKey,
        odealSecretKey,
        odealDeviceKey
      });
      alert("Ödeal ayarları güncellendi.");
    } catch(err) {
      alert("Hata oluştu.");
    }
  };

  const handleToggleOdealProfile = async (profileType: 'INTERNAL_BASKET' | 'EXTERNAL_DEVICE_TO_DEVICE') => {
    if (!odealMerchantKey || !odealSecretKey) {
      alert("Lütfen önce Merchant Key ve Secret Key bilgilerini kaydedin.");
      return;
    }
    
    try {
      const { getApiToken } = await import('../services/useServerData');
      const token = getApiToken();
      const res = await fetch('/api/odeal/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ profileType, merchantKey: odealMerchantKey, secretKey: odealSecretKey })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Cihaz profili başarıyla " + (profileType === 'EXTERNAL_DEVICE_TO_DEVICE' ? 'D2D (Entegrasyon)' : 'Normal (Bağımsız)') + " moduna alındı!");
      } else {
        alert("Hata: " + (data.error || "Bilinmeyen hata"));
      }
    } catch(err) {
      alert("İstek gönderilirken hata oluştu.");
    }
  };

  const handleUpdateGeneralSettings"""
code = code.replace("const handleUpdateGeneralSettings", func_insert)

with open('components/SettingsView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("done")
