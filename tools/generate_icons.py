import os
import sys

def main():
    root_dir = os.path.dirname(os.path.dirname(__file__))
    logo_file = os.path.join(root_dir, "Logolibro.png")
    if os.path.exists(logo_file):
        from convert_icon import convert_to_app_icon
        print(f"Utilizzo del logo ufficiale: {logo_file}")
        convert_to_app_icon(logo_file)
        return

if __name__ == "__main__":
    main()
