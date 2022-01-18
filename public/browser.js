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
});

function submitForm(e) {
  var formData = {};
  $("input.form-control").each(function () {
    formData[this.name] = this.value;
  });

  const cbAws = document.querySelector("#aws");
  const cbAzure = document.querySelector("#azure");
  var checkBox = {
    azure: cbAzure.checked,
    aws: cbAws.checked,
  };

  const mergedData = { ...formData, ...checkBox };

  axios
    .post("/create", {
      data: mergedData,
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

function showItem() {
  axios.get("/get-deployments").then((response) => {
    if (response.data.data.length) {
      $(".cluster-paragraph").text("Here are your clusters!");
    }
    response.data.data.forEach((response) => {
      const name = response.name.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
      $(".accordion").append(`
    <div class="accordion-item data-vpc=${response.vpc.vpcID}">
        <h2 class="accordion-header" id="panelsStayOpen-headingOne">
          <button class="accordion-button" type="button" data-bs-toggle="collapse"
            data-bs-target="#panelsStayOpen-collapseOne" aria-expanded="true" aria-controls="panelsStayOpen-collapseOne">
          Name: ${name}
          </button>
        </h2>
        <div id="panelsStayOpen-collapseOne" class="accordion-collapse collapse"
          aria-labelledby="panelsStayOpen-headingOne">
          <div class="accordion-body">
          <table id="table-accordition" class="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">VPC ID</th>
                  <th scope="col">EKS ARN</th>
                  <th scope="col">NatGateway</th>
                  <th scope="col">InternetGateway</th>
                  <th scope="col">Cluster SG</th>
                  <th scope="col">Nodes SG</th>
                  <th scope="col">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1</th>
                  <td>${response.vpc.vpcID}</td>
                  <td>${response.eks.eksClusterArn}</td>
                  <td>${response.gateway.intgwId}</td>
                  <td>${response.gateway.natgw}</td>
                  <td>${response.eks.eksControlPlaneSecurityGroup}</td>
                  <td>${response.eks.eksNodesSecurityGroup}</td>
                  <td><button id="delete-me" type="button" data-name=${response.name} data-id=${response._id} class="delete-me btn btn-danger">Delete</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`);
    });
  });
}

showItem();

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-me")) {
    axios
      .post("/delete", {
        name: e.target.getAttribute("data-name"),
        id: e.target.getAttribute("data-id"),
      })
      .then(function (result) {
        console.log("Record was deleted");
        window.location.reload();
      })
      .catch(function () {
        console.log("Please try it later on!");
      });
  }
});
