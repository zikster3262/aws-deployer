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

function showItem() {
  axios.get("/get-deployments").then((response) => {
    response.data.data.forEach((response) => {
      const name = response.name.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
      $(".accordion").append(`
    <div class="accordion-item data-vpc=${response.vpc.vpcID}">
        <h2 class="accordion-header" id="panelsStayOpen-headingOne">
          <button class="accordion-button" type="button" data-bs-toggle="collapse"
            data-bs-target="#panelsStayOpen-collapseOne" aria-expanded="true" aria-controls="panelsStayOpen-collapseOne">
          Cluster: ${name}
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
                  <th scope="col">Launch Template</th>
                  <th scope="col">NatGateway</th>
                  <th scope="col">InternetGateway</th>
                  <th scope="col">Security Group</th>
                  <th scope="col">ASG Security Group</th>
                  <th scope="col">Public RT</th>
                  <th scope="col">Private RT</th>
                  <th scope="col">Infra RT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1</th>
                  <td>${response.vpc.vpcID}</td>
                  <td>${response.eks.eksClusterArn}</td>
                  <td>${response.ec2.lauchTemplateID}</td>
                  <td>${response.gateway.intgwId}</td>
                  <td>${response.gateway.natgw}</td>
                  <td>${response.eks.eksControlPlaneSecurityGroup}</td>
                  <td>${response.eks.eksNodesSecurityGroup}</td>
                  <td>${response.routesTables.publicRouteTable}</td>
                  <td>${response.routesTables.privateRouteTable}</td>
                  <td>${response.routesTables.infraRouteTable}</td>
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
