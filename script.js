let numbers = [];
let selected = [];
let setType = "none"; // "sum", "product", "both", "none"
let score = 0;
let timeLeft = 120;
let diff = 10
let timerInterval = null;
let gameActive = false;
let highScore = localStorage.getItem("rationalSetHighScore") || 0;

function startGame() {
  score = 0;
  timeLeft = 120;
  gameActive = true;
  document.getElementById("diffInput").disabled = true;

  // read user input
  diff = parseInt(document.getElementById("diffInput").value);
  
  clearResult();

  generateNumbers();
  renderNumbers();

  document.getElementById("score").innerText = score;
  document.getElementById("time").innerText = timeLeft;

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("time").innerText = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  clearInterval(timerInterval);
  gameActive = false;

  document.getElementById("result").innerText = "⏰ Game over! Final score: " + score;

  let highScore = localStorage.getItem("rationalSetHighScore") || 0;

  let modifiedScore = score*diff

  if (modifiedScore > highScore) {
    localStorage.setItem("RationalSetHighScore", modifiedScore);
    highScore = modifiedScore;
  }

  score=0;

  document.getElementById("highScore").innerText = highScore;

  document.getElementById("diffInput").disabled = false;
}

//stdDev 25 seems pretty reasonable, if make it much bigger also change the cap of attempts on ensureValidSet
function generateNormalRandom(mean = 0, stdDev = diff) {
  let u1 = Math.random();
  let u2 = Math.random();

  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  return Math.round(z0 * stdDev + mean);
}

function generateNumbers() {

  numbers = [];

  while (numbers.length < 5) {

    let frac = generateRandomFraction();

    if (!containsFraction(numbers, frac)) {
      numbers.push(frac);
    }
  }

  ensureValidSet();

  shuffleArray(numbers);

  renderNumbers();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getSubsetSumsWithSize(arr) {
  let results = [];

  let n = arr.length;

  for (let mask = 1; mask < (1 << n); mask++) {

    let sum = { num: 0, den: 1 };
    let count = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum = addFractions(sum, arr[i]);
        count++;
      }
    }

    results.push({ sum, count });
  }

  return results;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

function simplify(frac) {
  let g = gcd(frac.num, frac.den);

  let num = frac.num / g;
  let den = frac.den / g;

  if (den < 0) {
    num *= -1;
    den *= -1;
  }

  return { num, den };
}

function negateFraction(frac) {
  return {
    num: -frac.num,
    den: frac.den
  };
}

function addFractions(a, b) {
  return simplify({
    num: a.num * b.den + b.num * a.den,
    den: a.den * b.den
  });
}

function isZero(frac) {
  return frac.num === 0;
}

function multiplyFractions(a, b) {
  return simplify({
    num: a.num * b.num,
    den: a.den * b.den
  });
}

function generateRandomFraction(stdev = diff) {

  let num = 0;
  let den = 0;

  while (num === 0) {
    num = generateNormalRandom(0, stdev);
  }

  while (den === 0) {
    den = generateNormalRandom(0, stdev);
  }

  return simplify({ num, den });
}

function fractionsEqual(a, b) {
  return a.num === b.num && a.den === b.den;
}

function formatFraction(frac) {
  if (frac.den === 1) {
    return frac.num.toString();
  }

  return `${frac.num}/${frac.den}`;
}

function containsFraction(arr, frac) {
  return arr.some(f => fractionsEqual(f, frac));
}

function hasZeroSumSet(nums) {

  let positives = nums.filter(f => f.num > 0);
  let negatives = nums.filter(f => f.num < 0);

  let pos = getSubsetSumsWithSize(positives);
  let neg = getSubsetSumsWithSize(negatives);

  let hasSumZero = false;

  // --- SUM CHECK ---
  for (let p of pos) {
    for (let n of neg) {

      let negated = negateFraction(n.sum);

      if (
        fractionsEqual(p.sum, negated) &&
        (p.count + n.count >= 3)
      ) {
        hasSumZero = true;
      }
    }
  }

  // --- PRODUCT CHECK ---
  let hasProductOne = false;

  let n = nums.length;

  for (let mask = 1; mask < (1 << n); mask++) {

    let product = { num: 1, den: 1 };
    let count = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        product = multiplyFractions(product, nums[i]);
        count++;
      }
    }

    if (
      count >= 3 &&
      fractionsEqual(product, { num: 1, den: 1 })
    ) {
      hasProductOne = true;
    }
  }

  // --- UPDATE GLOBAL STATE ---
  if (hasSumZero && hasProductOne) {
    setType = "both";
  } else if (hasSumZero) {
    setType = "sum";
  } else if (hasProductOne) {
    setType = "product";
  } else {
    setType = "none";
  }

  // --- RETURN BOOLEAN FOR COMPATIBILITY ---
  return hasSumZero || hasProductOne;
}

function drawCard() {

  let newFrac;

  while (true) {

    newFrac = generateRandomFraction();

    if (!containsFraction(numbers, newFrac)) {
      break;
    }
  }

  numbers.push(newFrac);
}

function renderNumbers() {

  let container = document.getElementById("numbers");

  container.innerHTML = "";

  selected = [];

  numbers.forEach((num, index) => {

    let btn = document.createElement("button");

    btn.innerText = formatFraction(num);

    btn.onclick = () => {

      btn.classList.toggle("selected");

      if (selected.includes(index)) {
        selected = selected.filter(i => i !== index);
      } else {
        selected.push(index);
      }
    };

    container.appendChild(btn);
  });
}

function ensureValidSet(maxAttempts = 20) {

  let attempts = 0;

  while (!hasZeroSumSet(numbers) && attempts < maxAttempts) {

    drawCard();

    attempts++;
  }

  shuffleArray(numbers);
}

function submitSet() {

  if (selected.length < 3) {
    document.getElementById("result").innerText = "Pick at least 3!";
    return;
  }

  // --- SUM ---
  let sum = { num: 0, den: 1 };

  for (let i of selected) {
    sum = addFractions(sum, numbers[i]);
  }

  // --- PRODUCT ---
  let product = { num: 1, den: 1 };

  for (let i of selected) {
    product = multiplyFractions(product, numbers[i]);
  }

  let valid =
    isZero(sum) ||
    fractionsEqual(product, { num: 1, den: 1 });

  if (valid) {

    document.getElementById("result").innerText = "Correct!";

    if (gameActive) {
      score += selected.length;
    }

    numbers = numbers.filter((_, i) => !selected.includes(i));

  } else {

    document.getElementById("result").innerText = "Not valid!";

    if (gameActive) {
      score -= 1;
    }
  }

  ensureValidSet();
  renderNumbers();

  document.getElementById("score").innerText = score;
  updateSetStatus();
}

function stopGame() {
  if (!gameActive) return;

  endGame();
}

function handleDrawCard() {
  drawCard();          // add the number
  clearResult();
  renderNumbers();     // update display
  if (gameActive)
    score -=1;           // penalty to avoid spamming to guarantee easy sets
  document.getElementById("score").innerText = score;
  updateSetStatus();   // update valid set message
}

function updateSetStatus() {
  let status = hasZeroSumSet(numbers);

  let text = status ? "✅ Valid set exists" : "❌ No valid sets";

  document.getElementById("setStatus").innerText = text;
}

function showHint() {

  let text;
  if (gameActive) {
    score -= 1;
    document.getElementById("score").innerText = score; 
  }

  switch (setType) {

    case "sum":
      text = "💡 Hint: Look for numbers that cancel out to 0";
      break;

    case "product":
      text = "💡 Hint: Look for numbers that multiply to 1";
      break;

    case "both":
      text = "💡 Hint: You can solve this via SUM or PRODUCT";
      break;

    default:
      text = "💡 Hint: No valid set exists yet — draw more cards";
  }

  document.getElementById("result").innerText = text;
}

function clearResult() {
  document.getElementById("result").innerText = "";
}

document.getElementById("submitBtn").onclick = submitSet;

generateNumbers();
updateSetStatus();

const diffInput = document.getElementById("diffInput");

diffInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {

    let val = parseInt(diffInput.value);

    if (isNaN(val) || val < 1) {
      diff = 25;
      diffInput.value = diff;
    } else {
      diff = val;
    }

    generateNumbers();
    updateSetStatus();
  }
});
let savedHigh = localStorage.getItem("rationalSetHighScore") || 0;
document.getElementById("rationalSetHighScore").innerText = savedHigh;
