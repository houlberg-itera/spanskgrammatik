-- Sample exercises for the Spanish learning app
-- This file contains sample exercises for each level and topic

-- A1 Level Exercises

-- Exercise 1: Ser vs Estar - Multiple Choice
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(2, 'A1', 'grammar', 'Ser eller Estar - Grundlæggende', 'Ser o Estar - Básico', 'Øv dig i at vælge mellem ser og estar', 'Practica eligir entre ser y estar', '{
  "instructions_da": "Vælg den korrekte form af enten ''ser'' eller ''estar'' for hvert spørgsmål.",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question_da": "María ___ lærer (hun arbejder som lærer)",
      "options": ["es", "está", "son", "están"],
      "correct_answer": "es",
      "explanation_da": "Vi bruger ''ser'' (es) for permanente egenskaber som profession. María es profesora = María er lærer (som erhverv).",
      "points": 1
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question_da": "El café ___ caliente (kaffen er varm lige nu)",
      "options": ["es", "está", "son", "están"],
      "correct_answer": "está",
      "explanation_da": "Vi bruger ''estar'' (está) for midlertidige tilstande som temperatur. Kaffen er varm lige nu, men den kan blive kold.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "multiple_choice",
      "question_da": "Nosotros ___ en casa (vi er hjemme)",
      "options": ["somos", "estamos", "es", "está"],
      "correct_answer": "estamos",
      "explanation_da": "Vi bruger ''estar'' (estamos) for placering/position. At være hjemme er en midlertidig placering.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "multiple_choice",
      "question_da": "Ella ___ muy inteligente (hun er meget intelligent)",
      "options": ["es", "está", "son", "están"],
      "correct_answer": "es",
      "explanation_da": "Vi bruger ''ser'' (es) for permanente karakteristika som intelligens. Dette er en grundlæggende egenskab ved personen.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "multiple_choice",
      "question_da": "Los niños ___ cansados (børnene er trætte)",
      "options": ["son", "están", "es", "está"],
      "correct_answer": "están",
      "explanation_da": "Vi bruger ''estar'' (están) for midlertidige tilstande som at være træt. Børnene er trætte nu, men de vil ikke altid være det.",
      "points": 1
    }
  ]
}', false);

-- Exercise 2: Substantiver og artikler - Fill in the blank
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(1, 'A1', 'grammar', 'Substantiver og artikler', 'Sustantivos y artículos', 'Øv dig i at bruge korrekte artikler med substantiver', 'Practica usar artículos correctos con sustantivos', '{
  "instructions_da": "Udfyld med den korrekte artikel (el, la, los, las, un, una, unos, unas).",
  "questions": [
    {
      "id": "q1",
      "type": "fill_in_blank",
      "question_da": "___ casa (huset - bestemt artikel)",
      "correct_answer": "la",
      "explanation_da": "''Casa'' er hunkøn (femininum), så vi bruger ''la''. La casa = huset.",
      "points": 1
    },
    {
      "id": "q2",
      "type": "fill_in_blank",
      "question_da": "___ libros (bøgerne - bestemt artikel)",
      "correct_answer": "los",
      "explanation_da": "''Libros'' er hankøn flertal (masculino plural), så vi bruger ''los''. Los libros = bøgerne.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question_da": "___ mesa (et bord - ubestemt artikel)",
      "correct_answer": "una",
      "explanation_da": "''Mesa'' er hunkøn (femininum), så vi bruger ''una''. Una mesa = et bord.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "fill_in_blank",
      "question_da": "___ estudiantes (nogle studerende - ubestemt artikel)",
      "correct_answer": "unos",
      "explanation_da": "''Estudiantes'' er flertal, og vi bruger ''unos'' for ubestemt artikel i flertal. Unos estudiantes = nogle studerende.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "fill_in_blank",
      "question_da": "___ perro (hunden - bestemt artikel)",
      "correct_answer": "el",
      "explanation_da": "''Perro'' er hankøn (masculino), så vi bruger ''el''. El perro = hunden.",
      "points": 1
    }
  ]
}', false);

-- Exercise 3: Verbum konjugation - Regular verbs
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(4, 'A1', 'conjugation', 'Regelmæssige verbum - Præsens', 'Verbos regulares - Presente', 'Øv dig i at bøje regelmæssige verbum i præsens', 'Practica conjugar verbos regulares en presente', '{
  "instructions_da": "Bøj verbummet i parenteser til den korrekte form i præsens.",
  "questions": [
    {
      "id": "q1",
      "type": "fill_in_blank",
      "question_da": "Yo ___ (hablar) español",
      "correct_answer": "hablo",
      "explanation_da": "Verbum ''hablar'' bøjes til ''hablo'' for ''yo'' (jeg). Endelsen -ar bliver til -o.",
      "points": 1
    },
    {
      "id": "q2",
      "type": "fill_in_blank",
      "question_da": "Tú ___ (comer) fruta",
      "correct_answer": "comes",
      "explanation_da": "Verbum ''comer'' bøjes til ''comes'' for ''tú'' (du). Endelsen -er bliver til -es.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question_da": "Ella ___ (vivir) en Madrid",
      "correct_answer": "vive",
      "explanation_da": "Verbum ''vivir'' bøjes til ''vive'' for ''ella'' (hun). Endelsen -ir bliver til -e.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "fill_in_blank",
      "question_da": "Nosotros ___ (estudiar) gramática",
      "correct_answer": "estudiamos",
      "explanation_da": "Verbum ''estudiar'' bøjes til ''estudiamos'' for ''nosotros'' (vi). Endelsen -ar bliver til -amos.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "fill_in_blank",
      "question_da": "Ellos ___ (escribir) cartas",
      "correct_answer": "escriben",
      "explanation_da": "Verbum ''escribir'' bøjes til ''escriben'' for ''ellos'' (de). Endelsen -ir bliver til -en.",
      "points": 1
    }
  ]
}', false);

-- A2 Level Exercises

-- Exercise 4: Pretérito perfecto
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(5, 'A2', 'grammar', 'Datid - Pretérito Perfecto', 'Pretérito Perfecto', 'Øv dig i at bruge pretérito perfecto (have + participium)', 'Practica usar el pretérito perfecto (haber + participio)', '{
  "instructions_da": "Bøj sætningen til pretérito perfecto ved at bruge haber + participium.",
  "questions": [
    {
      "id": "q1",
      "type": "fill_in_blank",
      "question_da": "Yo ___ ___ (comer) en el restaurante",
      "correct_answer": "he comido",
      "explanation_da": "Pretérito perfecto dannes med ''haber'' + participium. ''He comido'' = jeg har spist.",
      "points": 1
    },
    {
      "id": "q2",
      "type": "fill_in_blank",
      "question_da": "Tú ___ ___ (hablar) con María",
      "correct_answer": "has hablado",
      "explanation_da": "''Has hablado'' = du har talt. ''Haber'' bøjes til ''has'' for ''tú''.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question_da": "Nosotros ___ ___ (terminar) el trabajo",
      "correct_answer": "hemos terminado",
      "explanation_da": "''Hemos terminado'' = vi har afsluttet. ''Haber'' bøjes til ''hemos'' for ''nosotros''.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "multiple_choice",
      "question_da": "Ella ___ estado en España tres veces",
      "options": ["ha", "he", "has", "han"],
      "correct_answer": "ha",
      "explanation_da": "''Ha estado'' = hun har været. ''Haber'' bøjes til ''ha'' for ''ella/él''.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "fill_in_blank",
      "question_da": "Ellos ___ ___ (escribir) una carta",
      "correct_answer": "han escrito",
      "explanation_da": "''Han escrito'' = de har skrevet. ''Escribir'' har uregelmæssigt participium: ''escrito''.",
      "points": 1
    }
  ]
}', false);

-- Exercise 5: Irregular verbs
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(6, 'A2', 'conjugation', 'Uregelmæssige verbum', 'Verbos irregulares', 'Øv dig i almindelige uregelmæssige verbum', 'Practica verbos irregulares comunes', '{
  "instructions_da": "Bøj de uregelmæssige verbum i præsens.",
  "questions": [
    {
      "id": "q1",
      "type": "fill_in_blank",
      "question_da": "Yo ___ (tener) hambre",
      "correct_answer": "tengo",
      "explanation_da": "''Tener'' er uregelmæssigt. I første person ental bliver det ''tengo''.",
      "points": 1
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question_da": "Tú ___ (poder) ayudarme",
      "options": ["puedes", "puede", "podemos", "pueden"],
      "correct_answer": "puedes",
      "explanation_da": "''Poder'' ændrer ''o'' til ''ue'' i bøjning. For ''tú'' bliver det ''puedes''.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question_da": "Nosotros ___ (venir) mañana",
      "correct_answer": "venimos",
      "explanation_da": "''Venir'' er uregelmæssigt, men for ''nosotros'' bevarer det stammen: ''venimos''.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "fill_in_blank",
      "question_da": "Ella ___ (querer) café",
      "correct_answer": "quiere",
      "explanation_da": "''Querer'' ændrer ''e'' til ''ie''. For ''ella'' bliver det ''quiere''.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "multiple_choice",
      "question_da": "Yo ___ (ir) al cine",
      "options": ["voy", "va", "vamos", "van"],
      "correct_answer": "voy",
      "explanation_da": "''Ir'' er meget uregelmæssigt. For ''yo'' er formen ''voy''.",
      "points": 1
    }
  ]
}', false);

-- B1 Level Exercise

-- Exercise 6: Subjunctive mood
INSERT INTO public.exercises (topic_id, level, type, title_da, title_es, description_da, description_es, content, ai_generated) VALUES
(8, 'B1', 'grammar', 'Konjunktiv - Grundlæggende', 'Subjuntivo - Básico', 'Øv dig i at bruge konjunktiv efter følelser og ønsker', 'Practica usar el subjuntivo después de emociones y deseos', '{
  "instructions_da": "Vælg den korrekte form af verbummet i konjunktiv eller indikativ.",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question_da": "Espero que tú ___ bien (jeg håber du har det godt)",
      "options": ["estás", "estés", "estar", "estado"],
      "correct_answer": "estés",
      "explanation_da": "Efter ''espero que'' (jeg håber at) bruger vi konjunktiv. ''Estés'' er konjunktiv af ''estar''.",
      "points": 1
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question_da": "Me alegra que ellos ___ aquí (jeg er glad for at de er her)",
      "options": ["vienen", "vengan", "venir", "vinieron"],
      "correct_answer": "vengan",
      "explanation_da": "Efter følelsesudtryk som ''me alegra que'' bruger vi konjunktiv. ''Vengan'' er konjunktiv af ''venir''.",
      "points": 1
    },
    {
      "id": "q3",
      "type": "multiple_choice",
      "question_da": "Es importante que nosotros ___ (det er vigtigt at vi studerer)",
      "options": ["estudiamos", "estudiemos", "estudiar", "estudiado"],
      "correct_answer": "estudiemos",
      "explanation_da": "Efter ''es importante que'' bruger vi konjunktiv. ''Estudiemos'' er konjunktiv af ''estudiar''.",
      "points": 1
    },
    {
      "id": "q4",
      "type": "multiple_choice",
      "question_da": "Dudo que ella ___ la verdad (jeg tvivler på at hun siger sandheden)",
      "options": ["dice", "diga", "decir", "dicho"],
      "correct_answer": "diga",
      "explanation_da": "Efter ''dudo que'' (jeg tvivler på at) bruger vi konjunktiv. ''Diga'' er konjunktiv af ''decir''.",
      "points": 1
    },
    {
      "id": "q5",
      "type": "multiple_choice",
      "question_da": "Quiero que tú ___ conmigo (jeg vil have at du kommer med mig)",
      "options": ["vienes", "vengas", "venir", "viniste"],
      "correct_answer": "vengas",
      "explanation_da": "Efter ''quiero que'' (jeg vil have at) bruger vi konjunktiv. ''Vengas'' er konjunktiv af ''venir''.",
      "points": 1
    }
  ]
}', false);

