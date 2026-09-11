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
    print("ERRORE: Librerie mancanti. pip install pydub google-genai")
    exit(1)

def calculate_similarity(text1, text2):
    t1 = re.sub(r'[^\w\s]', '', text1.lower()).split()
    t2 = re.sub(r'[^\w\s]', '', text2.lower()).split()
    if not t1 and not t2: return 100.0
    sm = difflib.SequenceMatcher(None, t1, t2)
    return sm.ratio() * 100

class RotatingGeminiClient:
    def __init__(self, api_keys):
        self.api_keys = api_keys
        self.current_index = 0
        self.client = genai.Client(api_key=self.api_keys[self.current_index])
        
    def rotate(self):
        self.current_index = (self.current_index + 1) % len(self.api_keys)
        print(f"    [!] Ruoto chiave API... (Nuova chiave indice: {self.current_index})")
        self.client = genai.Client(api_key=self.api_keys[self.current_index])
        
    def transcribe(self, audio_path):
        prompt = (
            "You are a strict, professional verbatim audio transcriptionist. "
            "This audio is a university engineering lecture. "
            "Your task is to transcribe the attached audio EXACTLY verbatim, word-for-word. "
            "CRITICAL INSTRUCTIONS:\n"
            "- DO NOT summarize the audio.\n"
            "- DO NOT skip any sentences, hesitations, or repetitions.\n"
            "- DO NOT fix grammar or rephrase.\n"
            "- DO NOT add any markdown, comments, or conversational text.\n"
            "Just output the raw, exact transcript."
        )

        max_retries = 3 * len(self.api_keys)
        retries = 0
        
        while retries < max_retries:
            try:
                print(f"    Caricamento {os.path.basename(audio_path)} sui server Google...")
                uploaded_file = self.client.files.upload(file=audio_path)
                
                print("    Inizio inferenza su Gemini 3.8 Flash...")
                response = self.client.models.generate_content(
                    model='gemini-3.8-flash',
                    contents=[uploaded_file, prompt],
                    config=types.GenerateContentConfig(temperature=0.0)
                )
                
                transcript = response.text
                
                try:
                    self.client.files.delete(name=uploaded_file.name)
                except:
                    pass
                    
                return transcript
                
            except Exception as e:
                error_msg = str(e)
                print(f"    [!] Errore API: {error_msg}")
                if "429" in error_msg or "quota" in error_msg.lower() or "exhausted" in error_msg.lower():
                    print("    [!] Rate Limit o Quota esaurita rilevato.")
                    self.rotate()
                    retries += 1
                    time.sleep(2) # Pausa breve durante la rotazione
                else:
                    print("    [!] Errore generico, attendo 10s e riprovo...")
                    time.sleep(10)
                    retries += 1
                    
        print("    [X] Fallimento totale dopo troppi tentativi.")
        return ""

def run_experiment(audio_path, reference_txt_path, api_keys):
    print(f"Caricamento audio da: {audio_path}")
    audio = AudioSegment.from_file(audio_path)
    duration_ms = len(audio)
    print(f"Durata audio: {duration_ms / 1000:.2f} secondi")
    
    with open(reference_txt_path, 'r', encoding='utf-8') as f:
        reference_text = f.read()
    
    rotating_client = RotatingGeminiClient(api_keys)
    
    chunks_num = 8
    print(f"\n--- TEST ESCLUSIVO CON {chunks_num} CHUNK ---")
    chunk_length_ms = duration_ms // chunks_num
    
    full_transcript = []
    for i in range(chunks_num):
        start_ms = i * chunk_length_ms
        end_ms = (i + 1) * chunk_length_ms if i < chunks_num - 1 else duration_ms
        
        chunk = audio[start_ms:end_ms]
        chunk_path = f"temp_chunk_v2_{i}.mp3"
        chunk.export(chunk_path, format="mp3")
        
        print(f"\n  Chunk {i+1}/{chunks_num} ({start_ms/1000:.1f}s - {end_ms/1000:.1f}s)")
        text = rotating_client.transcribe(chunk_path)
        full_transcript.append(text)
        
        os.remove(chunk_path)
        time.sleep(2)
        
    final_text = " ".join(full_transcript)
    similarity = calculate_similarity(final_text, reference_text)
    
    output_path = "final_gemini_transcript.txt"
    with open(output_path, "w", encoding="utf-8") as out_f:
        out_f.write(final_text)
    
    print("\n==========================================")
    print(f"RISULTATO FINALE (8 CHUNK): {similarity:.2f}% SIMILARITÀ")
    print(f"Trascrizione salvata in: {output_path}")
    print("==========================================")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True)
    parser.add_argument('--txt', required=True)
    parser.add_argument('--api-keys', required=True, help="Comma separated list of API keys")
    args = parser.parse_args()
    
    keys = [k.strip() for k in args.api_keys.split(',') if k.strip()]
    if not keys:
        print("Nessuna chiave API fornita!")
        exit(1)
        
    run_experiment(args.audio, args.txt, keys)
