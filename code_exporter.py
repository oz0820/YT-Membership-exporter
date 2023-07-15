import os
import sys


def main():
    if len(sys.argv) == 2:
        name = sys.argv[1]
    else:
        name = "YT-Membership-exporter.js"

    os.makedirs("export", exist_ok=True)

    out = ""
    with open(name, 'r', encoding='utf-8') as f:
        for l in f.readlines():
            if l.strip().startswith("//"):
                continue
            index = l.find('//')
            if l.find("://") != -1:
                index = -1
            if index != -1:
                print(l[:index].strip(), end="")
                out += l[:index].strip()
            else:
                print(l.strip(), end="")
                out += l.strip()

    with open("export/YT-Membership-exporter.js", "w", encoding="utf-8") as f:
        f.write(out)


if __name__ == "__main__":
    main()
