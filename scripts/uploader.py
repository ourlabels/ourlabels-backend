import requests
import signal
import json
from sys import argv
from os import walk, listdir, path
from requests_toolbelt.multipart.encoder import MultipartEncoder
session = requests.session()
if len(argv) < 6:
    print("Usage: python uploader.py username password directory_prefix seq_prefix hostname")
    print("\t Where...")
    print("\t username: username on community-label-node")
    print("\t password: password for username on community-label-node")
    print("\t directory_prefix: absolute path for image directory sequences... may only be single sequence directory without trailing /")
    print("\t seq_prefix: How you want to identify your sequences")
    print("\t hostname: host where you are serving community-label-node")
    exit(1) 
USERNAME = argv[1]
PASSWORD = argv[2]
FILE_PREFIX = argv[3]
HOST_NAME = argv[4]
SEQ_PREFIX = argv[5] 
login_info = {"username": USERNAME, "password": PASSWORD}
from glob import glob
real_dirs = []
dirs = listdir(FILE_PREFIX)
json_tracking = None
if (path.isfile('./tracking.json')):
  with open('./tracking.json') as tracking:
      json_tracking = json.load(tracking)

if json_tracking is None:
    json_tracking = dict()


def terminate():
    with open('./tracking.json', 'w') as tracking:
        json.dump(json_tracking, tracking)
    exit(0)

def signal_handler(signal, frame):
    print()
    print("Quitting... saving state, thanks!")
    terminate()


signal.signal(signal.SIGINT, signal_handler)


for dir in dirs:
    if path.isdir(FILE_PREFIX + "/" + dir):
        real_dirs.append(int(dir))
real_dirs = sorted(real_dirs)
session.post(HOST_NAME+"/login", data=login_info)
for dir in real_dirs:
    files_in_dir = glob(FILE_PREFIX + "/" + str(dir) + "/*")
    for file in files_in_dir:
        parts = file.split("/")
        number = parts[-1].split("_")[-1].split(".")[0][-3:]
        if not (str(dir) in json_tracking):
          json_tracking[str(dir)] = 0
        if (int(number) > json_tracking[str(dir)]):
          print(dir, number)
          m = MultipartEncoder(fields={
              'image': (file, open(file, 'rb'), 'image/jpeg'),
              'seq': SEQ_PREFIX + str(dir),
              'imageid': parts[-1]
          })
          r = session.post(HOST_NAME+'/addImage',
                          data=m, headers={'Content-Type': m.content_type})
          print(r.status_code)
          json_tracking[str(dir)] += 1
terminate()

