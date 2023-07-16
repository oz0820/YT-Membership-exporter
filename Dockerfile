FROM winamd64/python:3.11.4

WORKDIR /app

COPY requirements.txt /app

RUN python -m pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install pyinstaller
