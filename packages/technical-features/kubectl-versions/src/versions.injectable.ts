import { getInjectable } from "@ogre-tools/injectable";
import versions from "../build/versions.json";

const kubectlVersionsInjectable = getInjectable({
  id: "kubectl-versions",
  instantiate: (di) => versions as [string, string][],
});

export default kubectlVersionsInjectable;
