import sys

file_path = 'src/lib/gcodeGenerator.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Fix PatternContext initialization in generatePatternPaths
ctx_search = """    zSteps,
    kerfValues,
  };"""

ctx_replace = """    zSteps,
    kerfValues,
    rasterStepover,
  };"""

content = content.replace(ctx_search, ctx_replace)

# Fix generateMatrix destructuring
matrix_search = """    machine,
    material,
  } = ctx;"""

matrix_replace = """    machine,
    material,
    rasterStepover,
  } = ctx;"""

content = content.replace(matrix_search, matrix_replace)

with open(file_path, 'w') as f:
    f.write(content)
