import { spawnSync } from "node:child_process";

const allowedPackages = new Set([
  "react-router",
  "react-router-dom"
]);

const allowedAdvisory =
  "https://github.com/advisories/GHSA-qwww-vcr4-c8h2";

const auditResult = spawnSync(
  "npm",
  ["audit", "--omit=dev", "--json"],
  {
    encoding: "utf8"
  }
);

if (auditResult.error) {
  console.error(
    "The production dependency audit could not be started.",
    auditResult.error.message
  );
  process.exit(1);
}

let auditReport;

try {
  auditReport = JSON.parse(auditResult.stdout);
} catch {
  console.error("npm audit returned an unreadable response.");
  process.exit(1);
}

const vulnerabilities =
  auditReport.vulnerabilities || {};

const unexpectedPackages = Object.keys(
  vulnerabilities
).filter(packageName =>
  !allowedPackages.has(packageName)
);

const advisoryUrls = Object.values(
  vulnerabilities
).flatMap(vulnerability =>
  (vulnerability.via || [])
    .filter(item =>
      typeof item === "object" && item !== null
    )
    .map(item => item.url)
    .filter(Boolean)
);

const unexpectedAdvisories = advisoryUrls.filter(
  advisoryUrl => advisoryUrl !== allowedAdvisory
);

if (
  unexpectedPackages.length > 0 ||
  unexpectedAdvisories.length > 0
) {
  console.error(
    "Unexpected production dependency vulnerabilities were found."
  );
  console.error(
    JSON.stringify(
      {
        packages: unexpectedPackages,
        advisories: unexpectedAdvisories
      },
      null,
      2
    )
  );
  process.exit(1);
}

if (Object.keys(vulnerabilities).length === 0) {
  console.log("No production dependency vulnerabilities were found.");
  process.exit(0);
}

console.log(
  "Only the documented React Router RSC advisory remains."
);
