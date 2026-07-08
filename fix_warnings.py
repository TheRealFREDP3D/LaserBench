import sys
import re

def fix_file(file_path, search, replace):
    with open(file_path, 'r') as f:
        content = f.read()
    if search in content:
        new_content = content.replace(search, replace)
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Fixed {file_path}")
    else:
        print(f"Search not found in {file_path}")

# Fix App.tsx - Add MachineFrontView and use currentPos
search_svg_block = """        )}
      </div>
    </div>
  );"""

replace_svg_block = """        )}
        {activeMachine && (
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
            <MachineFrontView machine={activeMachine} currentPos={currentPos} />
          </div>
        )}
      </div>
    </div>
  );"""

fix_file('src/App.tsx', search_svg_block, replace_svg_block)

# Remove unused jogPos in App.tsx
with open('src/App.tsx', 'r') as f:
    content = f.read()
content = content.replace('const jogPos = useSerialStore((s) => s.currentPos);', '// Removed unused jogPos')
with open('src/App.tsx', 'w') as f:
    f.write(content)

# Fix MachineFrontView.tsx
fix_file('src/components/MachineFrontView.tsx', 'MachineProfile, PathSegment', 'MachineProfile')

# Fix gcodeGenerator.ts - remove unused rasterStepover in other patterns
with open('src/lib/gcodeGenerator.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'rasterStepover,' in line and 'generateMatrix' not in line and 'PatternContext' not in line:
        continue # skip unused rasterStepover destructuring
    new_lines.append(line)

with open('src/lib/gcodeGenerator.ts', 'w') as f:
    f.writelines(''.join(new_lines))
