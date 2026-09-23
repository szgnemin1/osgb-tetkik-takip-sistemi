import re

with open('components/ReferralList.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = r'''<span className="text-white font-bold text-sm">₺\{referral\.totalPrice\?\.toLocaleString\('tr-TR'\) \|\| 0\}</span>\s*\{getPaymentBadge\(referral\.paymentMethod\)\}'''
new_block = r'''{referral.isExternalRecord ? (
                        <>
                          <span className="text-indigo-400 font-bold text-sm">-</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-indigo-400 bg-indigo-500/10">DIŞARIDAN</span>
                        </>
                      ) : (
                        <>
                          <span className="text-white font-bold text-sm">₺{referral.totalPrice?.toLocaleString('tr-TR') || 0}</span>
                          {getPaymentBadge(referral.paymentMethod)}
                        </>
                      )}'''

code = re.sub(old_block, new_block, code)

with open('components/ReferralList.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
