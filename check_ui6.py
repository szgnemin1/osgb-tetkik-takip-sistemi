with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'Adres' in line:
        for j in range(i-20, i+15):
            if 0 <= j < len(lines):
                print(f"{j+1}: {lines[j]}", end='')
        break
