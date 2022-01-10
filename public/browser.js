(function () {
  "use strict";
  const forms = document.querySelectorAll(".requires-validation");
  Array.from(forms).forEach(function (form) {
    form.addEventListener(
      "submit",
      function (event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

function submitForm(e) {
  var formData = {};
  $("input").each(function () {
    formData[this.name] = this.value;
  });

  axios
    .post("/create", {
      data: formData,
    })
    .then(function (response) {
      console.log(response);
      if (response.data.deploymentExists) {
        console.log("Deployment already exists.");
      } else {
        console.log("Creating deployment.");
      }
    })
    .catch(function () {
      console.log("Please try it later on!");
    });
}
