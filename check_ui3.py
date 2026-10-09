with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '05XX XXX XX XX' in line:
        for j in range(i-15, i+15):
            print(f"{j+1}: {lines[j]}", end='')
        break
