with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(500, 533):
    print(f"{i+1}: {lines[i]}", end='')
