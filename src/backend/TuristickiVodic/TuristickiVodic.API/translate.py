# -*- coding: utf-8 -*-

import sys
import warnings
from requests import RequestsDependencyWarning
from deep_translator import GoogleTranslator

warnings.simplefilter("ignore", RequestsDependencyWarning)

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

text = sys.argv[1]
from_code = sys.argv[2]
to_code = sys.argv[3]

translated = GoogleTranslator(source=from_code, target=to_code).translate(text)

print(translated)