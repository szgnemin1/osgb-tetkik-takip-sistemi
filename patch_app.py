import re

with open('App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
old_import = r"import { MobileReferralPreviewModal } from './components/MobileReferralPreviewModal';"
new_import = r"import { MobileReferralPreviewModal } from './components/MobileReferralPreviewModal';\nimport { AdminAuthModal } from './components/AdminAuthModal';"
code = code.replace(old_import, new_import)

# Add states
old_states = r"const \[isMobileMenuOpen, setIsMobileMenuOpen\] = useState\(false\);"
new_states = r'''const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
    // Admin Verified State
    const [isAdminVerified, setIsAdminVerified] = useState<boolean>(() => {
      return sessionStorage.getItem('admin_verified') === 'true';
    });
    const [pendingAdminTab, setPendingAdminTab] = useState<'dashboard' | 'referrals' | 'finance' | 'settings' | 'create_referral' | null>(null);'''
code = code.replace(old_states, new_states)

# Replace handleNavClick
old_nav = r'''const handleNavClick = \(tab: typeof activeTab\) => \{
        if \(tab === 'create_referral'\) \{
            setEditingReferral\(null\); 
        \}
        setActiveTab\(tab\);
        setIsMobileMenuOpen\(false\);
    \};'''
new_nav = r'''const handleNavClick = (tab: typeof activeTab) => {
        if (tab === 'finance' || tab === 'settings') {
            if (!isAdminVerified) {
                setPendingAdminTab(tab);
                setIsMobileMenuOpen(false);
                return;
            }
        }
        if (tab === 'create_referral') {
            setEditingReferral(null); 
        }
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };'''
code = re.sub(old_nav, new_nav, code)

# Inject the modal render
old_render = r"\{printingReferral && isMobile && \("
new_render = r'''{pendingAdminTab && (
          <AdminAuthModal 
             apiToken={getApiToken()}
             onSuccess={() => {
                 setIsAdminVerified(true);
                 sessionStorage.setItem('admin_verified', 'true');
                 setActiveTab(pendingAdminTab);
                 setPendingAdminTab(null);
             }}
             onCancel={() => setPendingAdminTab(null)}
          />
        )}

        {printingReferral && isMobile && ('''
code = code.replace(old_render, new_render)

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
