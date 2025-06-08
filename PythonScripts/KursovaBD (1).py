import sqlite3
import re
import pymorphy3
import unicodedata

morph = pymorphy3.MorphAnalyzer(lang="uk")


def normalize_vowels(word):

    char_substitution = {
        "a": "а",
        "e": "е",
        "i": "і",
        "o": "о",
        "p": "р",
        "c": "с",
        "y": "у",
        "x": "х",
        "A": "А",
        "B": "В",
        "C": "С",
        "E": "Е",
        "H": "Н",
        "I": "І",
        "K": "К",
        "M": "М",
        "O": "О",
        "P": "Р",
        "T": "Т",
        "X": "Х",
    }

    ukrainian_alphabet = set(
        "абвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
    )

    special_chars = set("'-`/")
    allowed_chars = ukrainian_alphabet.union(special_chars)

    normalized = unicodedata.normalize("NFD", word)

    normalized_no_accents = "".join(
        char
        for char in normalized
        if char in allowed_chars
        or (unicodedata.category(char)[0] != "M" and char.isalnum())
    )

    result = ""
    for char in normalized_no_accents:
        if char in char_substitution:
            result += char_substitution[char]
        else:
            result += char

    return result


def find_explanation_by_div(c, explanation_start, is_suffix=False):
    splitted = explanation_start.split(" ")

    if len(splitted) < 2:
        return explanation_start

    data = splitted[1].replace(")", "").replace("(", "").replace(";", "")

    if is_suffix:
        table = "Suffix"
        column_name = "identification_suffix"
    else:
        table = "Prefix"
        column_name = "identification_prefix"

    if len(splitted) > 2:
        semantic_info = roman_to_int(splitted[2].replace(";", ""))
        c.execute(
            f"SELECT explanation FROM {table} WHERE {column_name} = ? AND semantic_info = ?",
            (data, semantic_info),
        )
    else:
        c.execute(f"SELECT explanation FROM {table} WHERE {column_name} = ?", (data,))

    explanation = c.fetchone()
    if not explanation:
        explanation = explanation_start

    return explanation


def is_main_by_explanation(explanation, part_of_speech, gender):
    if gender and gender > 0 and gender <= len(genders):
        str_gender = genders[gender - 1]
    else:
        str_gender = "fffffffffffff"

    if part_of_speech and part_of_speech > 0 and part_of_speech <= len(speeches):
        str_speech = speeches[part_of_speech - 1]
    else:
        str_speech = "fffffffffffff"

    if str_gender in explanation or str_speech in explanation:
        return True
    else:
        return False


conn = sqlite3.connect("morphology.db")
c = conn.cursor()


c.execute(
    """CREATE TABLE IF NOT EXISTS Word (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                basic_word TEXT,
                split_word TEXT,
                sanitized_word TEXT,
                part_of_speech INTEGER,
                info_prefix TEXT DEFAULT "0",
                info_root TEXT,
                info_suffix TEXT,
                gender INTEGER,
                FOREIGN KEY (part_of_speech) REFERENCES Part_of_speech(id),
                FOREIGN KEY (info_prefix) REFERENCES Prefix(id),
                FOREIGN KEY (info_root) REFERENCES Root(id),
                FOREIGN KEY (info_suffix) REFERENCES Suffix(id)
             )"""
)

c.execute(
    """CREATE TABLE IF NOT EXISTS Prefix (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identification_prefix TEXT,
                allomorph TEXT,
                semantic_info INTEGER,
                explanation TEXT
             )"""
)


c.execute(
    """CREATE TABLE IF NOT EXISTS MainRoot (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identification_root TEXT,
                example TEXT
             )"""
)


c.execute(
    """CREATE TABLE IF NOT EXISTS SecondaryRoot (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identification_root TEXT,
                example TEXT,
                mainRootId INTEGER
             )"""
)


c.execute(
    """CREATE TABLE IF NOT EXISTS Suffix (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identification_suffix TEXT,
                allomorph TEXT,
                semantic_info INTEGER,
                explanation TEXT
             )"""
)

c.execute(
    """CREATE TABLE IF NOT EXISTS Morphological_alternation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id INTEGER,
                morphology_process TEXT,
                meaning TEXT,
                explanation TEXT,
                type TEXT,
                FOREIGN KEY (word_id) REFERENCES Word(id)
             )"""
)

c.execute(
    """CREATE TABLE IF NOT EXISTS Part_of_speech (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                part TEXT
             )"""
)


conn.commit()

print("Таблиці були успішно створені.")


speeches = [" прикметн", "іменн", "дієсло"]

genders = ["чоловіч", "жіноч", "середн"]


conn = sqlite3.connect("morphology.db")
c = conn.cursor()


c.execute("SELECT part FROM Part_of_Speech")
parts_of_speech = [part[0] for part in c.fetchall()]


with open("FullWordsFixed.txt", "r", encoding="utf-8") as file:
    for line in file:
        line = line.strip()

        if not line:
            continue

        comma_match = re.search(r",\s+[\wа-яА-ЯґҐєЄіІїЇ]+\.?$", line)
        if comma_match:

            comma_pos = comma_match.start()
            word_part = line[:comma_pos].strip()
            pos_info = line[comma_pos + 1 :].strip()
            additional_info = ""
        else:

            match = re.search(r"[{(\[<]", line)

            if match:
                split_position = match.start()
                word_part = line[:split_position].strip()
                additional_info = line[split_position:].strip()
                pos_info = ""
            else:

                parts = re.split(r"\s+", line, maxsplit=1)
                word_part = parts[0].strip()
                additional_info = parts[1].strip() if len(parts) > 1 else ""
                pos_info = ""

        if not word_part:
            continue

        split_word = word_part
        basic_word = word_part.replace("/", "").strip()

        if not basic_word:
            continue

        sanitized_word = normalize_vowels(basic_word)

        part_of_speech_id = 0
        if pos_info:
            for pos in parts_of_speech:
                if pos.lower() in pos_info.lower():
                    c.execute("SELECT id FROM Part_of_Speech WHERE part = ?", (pos,))
                    result = c.fetchone()
                    if result:
                        part_of_speech_id = result[0]
                    break

        c.execute(
            """INSERT INTO Word (basic_word, split_word, sanitized_word, part_of_speech, info_prefix, info_root, info_suffix) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (basic_word, split_word, sanitized_word, part_of_speech_id, 0, 0, 0),
        )
        word_id = c.lastrowid

        morphology_process = ""
        meaning = ""

        if additional_info:

            if "~" in additional_info:
                morphology_process = additional_info
            else:
                meaning = additional_info

        if morphology_process or meaning:
            c.execute(
                """INSERT INTO Morphological_Alternation (word_id, morphology_process, explanation, type, meaning) 
                         VALUES (?, ?, ?, ?, ?)""",
                (word_id, morphology_process, "", "", meaning),
            )


conn.commit()
conn.close()
print("Заповнення таблиць завершено.")

conn = sqlite3.connect("morphology.db")
c = conn.cursor()

c.execute("SELECT basic_word FROM Word")
words = c.fetchall()

for word_tuple in words:
    word = word_tuple[0]

    normalized_word = normalize_vowels(word)

    parsed_word = morph.parse(normalized_word)[0]
    gender = parsed_word.tag.gender

    if gender == "masc":
        gender_value = 1
    elif gender == "femn":
        gender_value = 2
    elif gender == "neut":
        gender_value = 3
    else:
        gender_value = None

    c.execute("UPDATE Word SET gender = ? WHERE basic_word = ?", (gender_value, word))


conn.commit()
conn.close()


morph = pymorphy3.MorphAnalyzer(lang="uk")

conn = sqlite3.connect("morphology.db")
c = conn.cursor()


c.execute("SELECT id, basic_word FROM Word")
words = c.fetchall()


c.execute("DELETE FROM Part_of_Speech")


for word_id, word in words:

    parsed_word = morph.parse(word)[0]

    if word.endswith("ий"):
        pos = "ADJF"
    else:
        pos = parsed_word.tag.POS

    if not pos:
        pos = "UNKNOWN"

    c.execute("SELECT id FROM Part_of_Speech WHERE part = ?", (pos,))
    part_id = c.fetchone()

    if not part_id:

        c.execute("INSERT INTO Part_of_Speech (part) VALUES (?)", (pos,))
        part_id = c.lastrowid
    else:
        part_id = part_id[0]

    c.execute("UPDATE Word SET part_of_speech = ? WHERE id = ?", (part_id, word_id))

conn.commit()
conn.close()


def roman_to_int(s):
    roman_numerals = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5}
    result = 0
    prev_value = 0
    for char in reversed(s):
        value = roman_numerals.get(char, 0)
        if value < prev_value:
            result -= value
        else:
            result += value
        prev_value = value
    return result


def add_prefixes_to_db(db_name, file_name):
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    with open(file_name, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue

            parts = re.split(r"\s*—\s*", line, maxsplit=1)
            prefix_info = parts[0]
            explanation = parts[1] if len(parts) > 1 else ""

            match = re.match(r"([^\s]+)\s*(\([^\)]+\))?\s*([IVXLCDM]+)?", prefix_info)
            if match:
                identification_prefix = match.group(1)
                allomorph = match.group(2).strip("()") if match.group(2) else ""
                allomorph = allomorph.replace(
                    "перед глухими приголосними с/, іс/", ""
                ).strip(", ")
                semantic_info = roman_to_int(match.group(3)) if match.group(3) else 0

                c.execute(
                    """INSERT INTO Prefix (identification_prefix, allomorph, semantic_info, explanation)
                                 VALUES (?, ?, ?, ?)""",
                    (identification_prefix, allomorph, semantic_info, explanation),
                )

    conn.commit()
    conn.close()


add_prefixes_to_db("morphology.db", "prefix_data.txt")


def add_slashes_to_words(word_list):
    modified_list = []
    if len(word_list) == 1:
        return word_list
    else:
        for i, word in enumerate(word_list):
            if i == 0:
                modified_list.append(word + "/")
            elif i == len(word_list) - 1:
                modified_list.append("/" + word)
            else:
                modified_list.append("/" + word + "/")
        return modified_list


def assign_prefix_to_words(db_name):
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    c.execute("SELECT id, split_word, part_of_speech, gender FROM Word")
    words = c.fetchall()

    c.execute("SELECT id, identification_prefix, explanation FROM Prefix")
    prefixes = c.fetchall()

    for word_id, split_word, part_of_speech, gender in words:
        prefix_id = 0

        normalized_word = normalize_vowels(split_word)
        main_prefixes = []
        prefixes_list = []

        for prefix_id, prefix_info, explanation in prefixes:

            normalized_prefix = normalize_vowels(prefix_info)
            if normalized_word.startswith(normalized_prefix):

                if "див" in explanation:
                    explanation1 = find_explanation_by_div(c, explanation)
                if is_main_by_explanation(explanation, part_of_speech, gender):
                    main_prefixes.append(str(prefix_id))
                else:
                    prefixes_list.append(str(prefix_id))

        prefixes_list = main_prefixes + prefixes_list

        prefixes_list = ",".join(prefixes_list)
        if prefixes_list == "":
            prefixes_list = "0"
        c.execute(
            "UPDATE Word SET info_prefix = ? WHERE id = ?", (prefixes_list, word_id)
        )

    conn.commit()
    conn.close()


assign_prefix_to_words("morphology.db")


def add_roots_to_db(db_name, file_name):

    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    with open(file_name, "r", encoding="utf-8") as file:
        fileContent = file.read()
        splittedFile = fileContent.split("\n\n")

        for part in splittedFile:
            splittedPart = part.split("\n")
            for word in splittedPart:
                parts = re.split(r"\s*—\s*", word, maxsplit=1)
                identification_root = parts[0].strip().replace("!", "")
                example = parts[1] if len(parts) > 1 else ""
                if len(parts[0].strip()) > 0 and parts[0][0] == "!":
                    c.execute(
                        """INSERT INTO MainRoot (identification_root, example) VALUES (?, ?)""",
                        (identification_root, example),
                    )
                    mainRootId = c.lastrowid
                else:
                    if len(parts[0].strip()) > 0:
                        c.execute(
                            """INSERT INTO SecondaryRoot (identification_root, example, mainRootId) VALUES (?, ?, ?)""",
                            (identification_root, example, mainRootId),
                        )

    conn.commit()
    conn.close()


add_roots_to_db("morphology.db", "root_data.txt")


def assign_roots_to_words(db_name):
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    c.execute("SELECT id, identification_root FROM MainRoot")
    main_roots = c.fetchall()

    c.execute("SELECT id, identification_root, mainRootId FROM SecondaryRoot")
    secondary_roots = c.fetchall()

    normalized_main_roots = {
        normalize_vowels(root.replace("/", "").replace("'", "")): (root_id, root)
        for root_id, root in main_roots
    }
    normalized_secondary_roots = {
        normalize_vowels(sec_root.replace("/", "").replace("'", "")): (
            root_id,
            sec_root,
            main_id,
        )
        for root_id, sec_root, main_id in secondary_roots
    }

    c.execute("SELECT id, basic_word, split_word, info_prefix FROM Word")
    words = c.fetchall()

    for word_id, basic_word, split_word, info_prefix in words:

        parts = split_word.split("/")

        if len(parts) <= 1:
            c.execute("UPDATE Word SET info_root = ? WHERE id = ?", ("0", word_id))
            continue

        modified_parts = [part for part in parts if part.strip()]

        if not modified_parts:
            c.execute("UPDATE Word SET info_root = ? WHERE id = ?", ("0", word_id))
            continue

        start_idx = 0
        if info_prefix != "0" and len(modified_parts) > 1:
            start_idx = 1

        normalized_parts = [normalize_vowels(part) for part in modified_parts]

        found_main_roots = []
        found_secondary_roots = []

        for idx in range(start_idx, len(normalized_parts)):
            normalized_part = normalized_parts[idx]
            clean_part = normalized_part.strip()

            if clean_part in normalized_main_roots:
                root_id, original_root = normalized_main_roots[clean_part]
                found_main_roots.append(str(root_id))

            if clean_part in normalized_secondary_roots:
                root_id, original_root, main_id = normalized_secondary_roots[clean_part]
                found_secondary_roots.append(f"{main_id}_{root_id}")

        all_roots = found_main_roots + found_secondary_roots

        if not all_roots:
            c.execute("UPDATE Word SET info_root = ? WHERE id = ?", ("0", word_id))
        else:
            c.execute(
                "UPDATE Word SET info_root = ? WHERE id = ?",
                (",".join(all_roots), word_id),
            )

    conn.commit()
    conn.close()


assign_roots_to_words("morphology.db")


def add_suffixes_to_db(db_name, file_name):
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    with open(file_name, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue

            parts = re.split(r"\s*—\s*", line, maxsplit=1)
            suffix_info = parts[0]
            explanation = parts[1] if len(parts) > 1 else ""

            match = re.match(r"([^\s]+)\s*(\([^\)]+\))?\s*([IVXLCDM]+)?", suffix_info)
            if match:
                identification_suffix = match.group(1)
                allomorph = match.group(2).strip("()") if match.group(2) else ""
                semantic_info = roman_to_int(match.group(3)) if match.group(3) else 0

                c.execute(
                    """INSERT INTO Suffix (identification_suffix, allomorph, semantic_info, explanation)
                             VALUES (?, ?, ?, ?)""",
                    (identification_suffix, allomorph, semantic_info, explanation),
                )

    conn.commit()
    conn.close()


add_suffixes_to_db("morphology.db", "suffix_data.txt")


def assign_suffixes_to_words(db_name):
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    c.execute("SELECT id, identification_suffix, explanation FROM Suffix")
    suffixes = c.fetchall()

    c.execute("SELECT id, split_word, info_prefix, part_of_speech, gender FROM Word")
    words = c.fetchall()

    for word_id, split_word, info_prefix, part_of_speech, gender in words:

        parts = split_word.split("/")

        normalized_parts = add_slashes_to_words(parts)

        normalized_parts = [normalize_vowels(part) for part in normalized_parts]

        suffix_ids = []

        if info_prefix != 0:
            normalized_parts = normalized_parts[1:]

        main_suffixes = []

        for part in normalized_parts:
            for suffix_id, suffix, explanation in suffixes:
                if part == suffix:

                    if "див" in explanation:
                        explanation1 = find_explanation_by_div(c, explanation, True)

                    if is_main_by_explanation(explanation, part_of_speech, gender):
                        main_suffixes.append(suffix_id)
                    else:
                        suffix_ids.append(suffix_id)

        suffix_ids = main_suffixes + suffix_ids

        suffix_string = ",".join(str(sid) for sid in suffix_ids)

        c.execute(
            "UPDATE Word SET info_suffix = ? WHERE id = ?", (suffix_string, word_id)
        )

    conn.commit()
    conn.close()


assign_suffixes_to_words("morphology.db")


conn = sqlite3.connect("morphology.db")
c = conn.cursor()


conn.commit()
conn.close()
