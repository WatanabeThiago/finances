/**
 * Toca um som de notificação
 * Usa Web Audio API para criar um som sintetizado
 */
export function playNotificationSound() {
  try {
    // Criar contexto de áudio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Frequências para um som de "ding" agradável
    const frequencies = [800, 600]; // Hz
    const duration = 0.1; // segundos
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      // Controlar o volume - MÁXIMO POSSÍVEL!!!
      gainNode.gain.setValueAtTime(3.0, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      // Iniciar e parar
      const startTime = audioContext.currentTime + (index * duration * 0.5);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.error('Erro ao tocar som:', error);
  }
}
