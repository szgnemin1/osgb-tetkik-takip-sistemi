with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(560, 580):
    print(f"{i+1}: {lines[i]}", end='')
