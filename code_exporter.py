import sys


def main():
    if len(sys.argv) == 2:
        name = sys.argv[1]
    else:
        name = "YT-Membership-exporter.js"

    with open(name, 'r', encoding='utf8') as f:
        for l in f.readlines():
            if l.strip().startswith("//"):
                continue
            index = l.find('//')
            if l.find("://") != -1:
                index = -1
            if index != -1:
                print(l[:index].strip(), end="")
            else:
                print(l.strip(), end="")


if __name__ == "__main__":
    main()
