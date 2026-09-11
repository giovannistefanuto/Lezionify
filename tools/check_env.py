import sys

print(f"Python version: {sys.version}")

try:
    import torch
    print(f"PyTorch: {torch.__version__}, CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Device name: {torch.cuda.get_device_name(0)}")
except ImportError:
    print("PyTorch non installato.")

try:
    import whisper
    print("openai-whisper: installato")
except ImportError:
    print("openai-whisper non installato.")

try:
    import faster_whisper
    print("faster-whisper: installato")
except ImportError:
    print("faster-whisper non installato.")
