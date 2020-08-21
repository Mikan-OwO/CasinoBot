$("#btn").on("click", async function() {
  const id = $("input[name='uid']").val();
  fetch("https://mikan-owo.github.io/CasinoBot/test", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    },
    body: id
  })
    .then(res => res.json())
    .then(res => {
      if(res.error){
        $("#result").val(res.error).addClass("result-content-error")
      }else{
        $("#result").val(res.result).removeClass("result-content-error")
      }
    })
});
