const text = "Web Developer | Student | Learner";
let i = 0;
const typing = document.querySelector(".typing");

function typeEffect() {
  if (i < text.length) {
    typing.textContent += text.charAt(i);
    i++;
    setTimeout(typeEffect, 80);
  }
}

typeEffect();
