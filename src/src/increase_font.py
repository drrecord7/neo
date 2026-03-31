import re

path = '/Users/joon/Downloads/neo/src/src/App.jsx'
with open(path, 'r') as f:
    text = f.read()

# 1. Replace text-[Npx]
def repl_custom(m):
    val = int(m.group(1)) + 3
    return f'text-[{val}px]'
text = re.sub(r'text-\[(\d+)px\]', repl_custom, text)

# 2. Replace semantic sizes
mapping = {
    'text-xs': 'text-[15px]',
    'text-sm': 'text-[17px]',
    'text-base': 'text-[19px]',
    'text-lg': 'text-[21px]',
    'text-xl': 'text-[23px]',
    'text-2xl': 'text-[27px]',
    'text-3xl': 'text-[33px]',
    'text-4xl': 'text-[39px]',
    'text-5xl': 'text-[51px]'
}

for k, v in mapping.items():
    text = re.sub(rf'\b{k}\b', v, text)

# 3. Replace fontSize={N} 
def repl_fontsize(m):
    try:
        val = int(m.group(1)) + 3
        return f'fontSize={{{val}}}'
    except:
        return m.group(0)
text = re.sub(r'fontSize=\{(\d+)\}', repl_fontsize, text)

with open(path, 'w') as f:
    f.write(text)
