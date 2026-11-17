import sys
for name in sys.modules:
    if "mpfb" in name.lower():
        print(name)
