let mouse = {
    x: 0,
    y: 0,
    isInCanvas: function(){
        return !(this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height);
    }
}

const colorInput = document.getElementById('colorPicker');
let currentColor = colorInput.value;
colorInput.addEventListener('input', (e) => {
  currentColor = e.target.value;
});

document.addEventListener('mousemove', function (m){
    mouse.x = m.x - canvas.getBoundingClientRect().left;
    mouse.y = m.y - canvas.getBoundingClientRect().top;
});
document.addEventListener('contextmenu', function (event){
    if (mouse.isInCanvas()) {
        event.preventDefault();
    }
});

document.addEventListener('click', function(event) {
    entityRects.forEach(e => {
        e.changeColor();
    });
});

  
