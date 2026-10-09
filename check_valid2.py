with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'const isStep1Valid' in line:
        for j in range(i, i+15):
            print(f"{j+1}: {lines[j]}", end='')
        break
