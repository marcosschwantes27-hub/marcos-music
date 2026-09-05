import wave
import struct
import math

def generate_sample_wav(filename="musica_demonstracao.wav", duration=4, sample_rate=44100):
    num_samples = duration * sample_rate
    # Chord frequencies: C4 (261.63), E4 (329.63), G4 (392.00), B4 (493.88)
    frequencies = [261.63, 329.63, 392.00, 493.88]
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(2) # Stereo
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            # Smooth attack and decay envelope
            envelope = math.sin(math.pi * (i / num_samples))
            
            # Combine chord notes
            sample_val = 0.0
            for freq in frequencies:
                sample_val += math.sin(2.0 * math.pi * freq * t)
            
            sample_val = (sample_val / len(frequencies)) * envelope * 0.7
            int_val = int(sample_val * 32767.0)
            
            # Pack left and right channels
            data = struct.pack('<hh', int_val, int_val)
            wav_file.writeframesraw(data)

if __name__ == '__main__':
    generate_sample_wav()
    print("Música de demonstração gerada com sucesso!")
