import os
import sys

def apply_types():
    with open('types.ts', 'r', encoding='utf-8') as f:
        code = f.read()
    code = code.replace("isPasswordEnabled?: boolean;", "isPasswordEnabled?: boolean;\n    enableAdminOtp?: boolean;")
    with open('types.ts', 'w', encoding='utf-8') as f:
        f.write(code)

def apply_app():
    with open('App.tsx', 'r', encoding='utf-8') as f:
        code = f.read()
    code = code.replace("if (tab === 'finance' || tab === 'settings') {\n            if (!isAdminVerified) {", "if (tab === 'finance' || tab === 'settings') {\n            if (appSettings?.enableAdminOtp && !isAdminVerified) {")
    with open('App.tsx', 'w', encoding='utf-8') as f:
        f.write(code)

def apply_settings():
    with open('components/SettingsView.tsx', 'r', encoding='utf-8') as f:
        code = f.read()
        
    code = code.replace(
        "const [isPasswordEnabled, setIsPasswordEnabled] = useState(settings.isPasswordEnabled || false);",
        "const [isPasswordEnabled, setIsPasswordEnabled] = useState(settings.isPasswordEnabled || false);\n    const [enableAdminOtp, setEnableAdminOtp] = useState(settings.enableAdminOtp || false);"
    )
    code = code.replace(
        "isPasswordEnabled: isPasswordEnabled,",
        "isPasswordEnabled: isPasswordEnabled,\n          enableAdminOtp: enableAdminOtp,"
    )
    
    ui_block = r'''                   {/* Security Settings */}
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">Yönetici Paneli Koruması</label>
                         <p className="text-xs text-slate-400 mt-1">Kasa & Finans ve Ayarlar sekmelerine girerken WhatsApp üzerinden şifre (OTP) istensin.</p>
                      </div>
                      <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 p-2 rounded-lg border border-slate-700">
                         <input 
                           type="checkbox" 
                           checked={enableAdminOtp}
                           onChange={(e) => setEnableAdminOtp(e.target.checked)}
                           className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-800"
                         />
                         <span className="text-sm text-white font-medium">OTP Koruması Açık</span>
                      </label>
                   </div>'''

    code = code.replace(
        "{/* END Auto Print & Print Size */}",
        "{/* END Auto Print & Print Size */}\n" + ui_block
    )
    with open('components/SettingsView.tsx', 'w', encoding='utf-8') as f:
        f.write(code)

apply_types()
apply_app()
apply_settings()
print("Applied successfully.")
