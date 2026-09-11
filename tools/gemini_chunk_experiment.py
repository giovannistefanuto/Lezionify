import os
import argparse
import time
import difflib
import re

try:
    from pydub import AudioSegment
    from google import genai
    from google.genai import types
except ImportError:
    print("ERRORE: Librerie mancanti. Prima di eseguire, installa le dipendenze:")
    print("pip install pydub google-genai")
    print("Nota: pydub richiede ffmpeg installato sul sistema.")
    exit(1)

def calculate_similarity(text1, text2):
    """
    Calcola la similarità tra due testi pulendoli da punteggiatura
    e confrontando le parole (SequenceMatcher).
    """
    t1 = re.sub(r'[^\w\s]', '', text1.lower()).split()
    t2 = re.sub(r'[^\w\s]', '', text2.lower()).split()
    
    # Se entrambi sono vuoti, sono identici
    if not t1 and not t2:
        return 100.0
    
    sm = difflib.SequenceMatcher(None, t1, t2)
    return sm.ratio() * 100

def transcribe_audio_chunk(client, audio_path):
    print(f"    Caricamento {os.path.basename(audio_path)} su Gemini API...")
    
    try:
        uploaded_file = client.files.upload(file=audio_path)
    except Exception as e:
        print(f"    [!] Errore di upload: {e}")
        return ""
    
    prompt = (
        "Transcribe the following audio exactly verbatim, word for word. "
        "Do not summarize, do not omit anything, do not add markdown formatting or conversational text. "
        "Just output the exact words spoken."
    )
    
    transcript = ""
    try:
        # Usa gemini-2.5-flash (se disponibile) o gemini-1.5-flash
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                temperature=0.0
            )
        )
        transcript = response.text
    except Exception as e:
        print(f"    [!] Errore di inferenza Gemini: {e}")
        try:
             # Fallback su 1.5-flash in caso di errore
             response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=[uploaded_file, prompt],
                config=types.GenerateContentConfig(temperature=0.0)
            )
             transcript = response.text
        except Exception as e2:
             print(f"    [!] Fallimento totale inferenza: {e2}")
    
    # Pulizia del file sui server Google
    try:
        client.files.delete(name=uploaded_file.name)
    except:
        pass
        
    return transcript if transcript else ""

def run_experiment(audio_path, reference_txt_path, api_key):
    print(f"Caricamento audio da: {audio_path}")
    audio = AudioSegment.from_file(audio_path)
    duration_ms = len(audio)
    print(f"Durata audio: {duration_ms / 1000:.2f} secondi")
    
    print(f"Caricamento trascrizione di riferimento: {reference_txt_path}")
    with open(reference_txt_path, 'r', encoding='utf-8') as f:
        reference_text = f.read()
    
    client = genai.Client(api_key=api_key)
    
    # Divisioni binarie da testare: partiamo da 4 come richiesto, e aggiungiamo 32 e 64
    splits = [4, 8, 16, 32, 64]
    results = {}
    
    for chunks_num in splits:
        print(f"\n--- TEST CON {chunks_num} CHUNK(S) ---")
        chunk_length_ms = duration_ms // chunks_num
        
        full_transcript = []
        for i in range(chunks_num):
            start_ms = i * chunk_length_ms
            # L'ultimo chunk si prende il resto per non perdere millisecondi
            end_ms = (i + 1) * chunk_length_ms if i < chunks_num - 1 else duration_ms
            
            chunk = audio[start_ms:end_ms]
            chunk_path = f"temp_chunk_{chunks_num}_{i}.mp3"
            chunk.export(chunk_path, format="mp3")
            
            print(f"  Chunk {i+1}/{chunks_num} ({start_ms/1000:.1f}s - {end_ms/1000:.1f}s)")
            text = transcribe_audio_chunk(client, chunk_path)
            full_transcript.append(text)
            
            os.remove(chunk_path)
            
            # Pausa per mitigare i Rate Limit (15 richieste al minuto sul piano Free)
            if chunks_num > 1:
                time.sleep(4) 
            
        final_text = " ".join(full_transcript)
        similarity = calculate_similarity(final_text, reference_text)
        print(f"==> Risultato totale con {chunks_num} chunk: Similarità {similarity:.2f}%")
        results[chunks_num] = similarity
        
        # Se otteniamo un punteggio accettabile, potremmo fermarci, ma per
        # l'esperimento esploriamo le potenze di due. Se va oltre il 95%, fermiamoci.
        if similarity >= 95.0:
            print(f"\nTrovato un livello eccellente ({similarity:.2f}%) con {chunks_num} chunk. Interrompo la ricerca!")
            break

    print("\n--- RIEPILOGO ESPERIMENTO ---")
    for k, v in results.items():
        print(f"  {k} Chunk: {v:.2f}% similarità")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Ricerca binaria chunk per trascrizione Gemini')
    parser.add_argument('--audio', required=True, help='Percorso del file audio (es. lezione.mp3)')
    parser.add_argument('--txt', required=True, help='Percorso della trascrizione di Whisper (.txt)')
    parser.add_argument('--api-key', required=True, help='La tua chiave API Google Gemini')
    args = parser.parse_args()
    
    run_experiment(args.audio, args.txt, args.api_key)
