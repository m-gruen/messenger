<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number | null = null;

interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  color: string;
}

const balls: Ball[] = [];
const colors = [
  'rgba(99, 102, 241, 0.5)',  // Indigo
  'rgba(139, 92, 246, 0.5)',  // Violet
  'rgba(129, 140, 248, 0.5)', // Light Indigo
  'rgba(167, 139, 250, 0.5)', // Light Violet
];

const initCanvas = () => {
  if (!canvas.value) return;
  
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;

  // Set canvas dimensions to match window
  const resizeCanvas = () => {
    if (!canvas.value) return;
    canvas.value.width = window.innerWidth;
    canvas.value.height = window.innerHeight - 50; // Subtract some height for other content
  };

  // Create the balls
  const createBalls = () => {
    balls.length = 0; // Clear any existing balls
    const ballCount = Math.floor(window.innerWidth / 100); // Adjust number based on screen size
    
    for (let i = 0; i < ballCount; i++) {
      const radius = Math.random() * 40 + 20; // Random size between 20-60
      const x = Math.random() * (canvas.value!.width - radius * 2) + radius;
      const y = Math.random() * (canvas.value!.height - radius * 2) + radius;
      const dx = (Math.random() - 0.5) * 1.5; // Random horizontal velocity
      const dy = (Math.random() - 0.5) * 1.5; // Random vertical velocity
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      balls.push({ x, y, radius, dx, dy, color });
    }
  };

  // Animation loop
  const animate = () => {
    if (!canvas.value || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    
    // Update and draw each ball
    balls.forEach(ball => {
      // Bounce off walls
      if (ball.x + ball.radius > canvas.value!.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
      }
      
      if (ball.y + ball.radius > canvas.value!.height || ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
      }
      
      // Move the ball
      ball.x += ball.dx;
      ball.y += ball.dy;
      
      // Draw the ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      
      // Add subtle glow effect
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    animationFrameId = requestAnimationFrame(animate);
  };

  // Handle window resize
  window.addEventListener('resize', () => {
    resizeCanvas();
    createBalls();
  });
  
  resizeCanvas();
  createBalls();
  animate();
};

onMounted(() => {
  initCanvas();
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', () => {});
});
</script>

<template>
  <div class="home-container">
    <canvas ref="canvas" class="background-animation"></canvas>
    
    <div class="content">
      <h3 class="welcome-text">Welcome to</h3>
      
      <div class="logo-container">
        <img src="/nexus_logo.png" alt="Nexus Logo" class="nexus-logo" />
        <h1 class="nexus-title">Nexus</h1>
      </div>
      
      <p class="tagline">End-to-End Encrypted Messaging</p>
      
      <div class="feature-badges">
        <span class="badge">Secure</span>
        <span class="badge">Private</span>
        <span class="badge">Self-hosted</span>
      </div>
      
      <p class="description">
        Your conversations protected with state-of-the-art encryption.
        <br>Take control of your messaging data today.
      </p>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 70px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 2rem;
  max-width: 700px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: fadeIn 1s ease-in-out;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.welcome-text {
  margin-bottom: 1rem;
  color: #6366f1;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 1px;
  animation: slideDown 1s ease;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.nexus-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-right: 1rem;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  animation: pulse 3s infinite;
}

.nexus-title {
  font-size: 4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
  animation: slideUp 1s ease;
}

.tagline {
  font-size: 1.5rem;
  color: #6b7280;
  margin-bottom: 2rem;
  animation: fadeIn 1.5s ease-in-out;
}

.feature-badges {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.badge {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);
  animation: fadeInUp 1.5s ease-in-out;
}

.description {
  color: #4b5563;
  line-height: 1.6;
  font-size: 1.125rem;
  animation: fadeIn 2s ease;
}

/* Dark mode adjustments */
:global(.dark) .content {
  background-color: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

:global(.dark) .welcome-text {
  color: #818cf8;
}

:global(.dark) .tagline {
  color: #9ca3af;
}

:global(.dark) .description {
  color: #d1d5db;
}

/* Animations */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
