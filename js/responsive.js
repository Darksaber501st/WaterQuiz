// Fixes gutter heights for flexbox layout
function checkGutterHeight() {
    const game = document.getElementById("game");
    const bottombar = document.getElementById("bottom-bar");
    const topbar = document.getElementById("top-bar");
    const heightB = bottombar.offsetHeight;
    const heightT = topbar.offsetHeight;
    const heightG = window.screen.height - heightB - heightT;
    if (window.screen.height > 600) {
        game.style.height = heightG*.8 + "px";
    } else {
        game.style.height = heightG*.95 + "px";
    }
}

window.onload = (event) => {
    checkGutterHeight();
};

window.addEventListener("resize", checkGutterHeight);