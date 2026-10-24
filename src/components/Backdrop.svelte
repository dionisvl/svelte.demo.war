<script>
  let { shift = 0 } = $props();
</script>

<div class="backdrop" aria-hidden="true" style:--shift={shift}>
  <div class="nebula"></div>
  <div class="stars far"></div>
  <div class="stars mid"></div>
  <div class="stars near"></div>
  <div class="horizon"></div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(120% 90% at 50% 0%, var(--deep) 0%, var(--night) 38%, var(--ink) 80%);
    z-index: 0;
  }

  .nebula {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(40% 32% at 20% 28%, rgb(59 232 255 / 0.16), transparent 70%),
      radial-gradient(36% 30% at 82% 62%, rgb(255 176 46 / 0.12), transparent 70%),
      radial-gradient(50% 40% at 60% 12%, rgb(110 80 255 / 0.14), transparent 70%);
    animation: drift 40s ease-in-out infinite alternate;
  }

  .stars {
    position: absolute;
    inset: 0 -40px;
    transform: translate3d(calc(var(--shift) * var(--depth) * -1px), 0, 0);
    transition: transform 0.25s ease-out;
    background-repeat: repeat;
    animation: fall linear infinite;
  }

  .far {
    background-image:
      radial-gradient(1px 1px at 30px 40px, #fff, transparent),
      radial-gradient(1px 1px at 120px 90px, #b9d6ff, transparent),
      radial-gradient(1px 1px at 200px 20px, #fff, transparent),
      radial-gradient(1px 1px at 70px 160px, #cde, transparent);
    background-size: 240px 200px;
    opacity: 0.55;
    --depth: 6;
    animation-duration: 120s;
  }

  .mid {
    background-image:
      radial-gradient(1.5px 1.5px at 60px 60px, #fff, transparent),
      radial-gradient(1.5px 1.5px at 190px 140px, var(--cyan), transparent),
      radial-gradient(1.5px 1.5px at 130px 230px, #fff, transparent);
    background-size: 300px 280px;
    opacity: 0.7;
    --depth: 16;
    animation-duration: 70s;
  }

  .near {
    background-image:
      radial-gradient(2px 2px at 90px 100px, #fff, transparent),
      radial-gradient(2.2px 2.2px at 280px 260px, var(--amber), transparent);
    background-size: 420px 380px;
    opacity: 0.8;
    --depth: 32;
    animation-duration: 36s;
  }

  .horizon {
    position: absolute;
    inset: auto 0 0;
    height: 28%;
    background: linear-gradient(to top, rgb(59 232 255 / 0.1), transparent);
  }

  @keyframes fall {
    to {
      background-position-y: 1200px;
    }
  }

  @keyframes drift {
    to {
      transform: translate3d(3%, 2%, 0) scale(1.06);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stars,
    .nebula {
      animation: none;
      transition: none;
    }
  }
</style>
