# -*- coding: utf-8 -*-

from deep_translator import GoogleTranslator
import sys

sys.stdout.reconfigure(encoding="utf-8")

text = sys.argv[1]
to_code = sys.argv[3]

translated = GoogleTranslator(source="auto", target=to_code).translate(text)

print(translated)