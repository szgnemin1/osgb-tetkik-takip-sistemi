def patch_app():
    with open('App.tsx', 'r', encoding='utf-8') as f:
        code = f.read()

    old_logic = """    const handleNavClick = (tab: typeof activeTab) => {
        if (tab === 'finance' || tab === 'settings') {
            if (appSettings?.enableAdminOtp && !isAdminVerified) {
                setPendingAdminTab(tab);
                setIsMobileMenuOpen(false);
                return;
            }
        }
        if (tab === 'create_referral') {"""
        
    new_logic = """    const handleNavClick = (tab: typeof activeTab) => {
        if (tab === 'finance' || tab === 'settings') {
            if (appSettings?.enableAdminOtp && !isAdminVerified) {
                setPendingAdminTab(tab);
                setIsMobileMenuOpen(false);
                return;
            }
        } else {
            // Başka bir sekmeye geçildiğinde yetkiyi iptal et
            setIsAdminVerified(false);
            sessionStorage.removeItem('admin_verified');
        }
        
        if (tab === 'create_referral') {"""

    if old_logic in code:
        code = code.replace(old_logic, new_logic)
        with open('App.tsx', 'w', encoding='utf-8') as f:
            f.write(code)
        print("Patched handleNavClick successfully.")
    else:
        print("Could not find old_logic in App.tsx")

patch_app()
