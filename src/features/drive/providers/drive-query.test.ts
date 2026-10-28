import { describe, expect, it } from "vitest";
import { escapeDriveQueryLiteral } from "./drive-query";

describe("Google Drive query literal escaping", () => {
  it("escapes both backslashes and quotes without changing normal folder names", () => {
    expect(escapeDriveQueryLiteral("MxTrove")).toBe("MxTrove");
    expect(escapeDriveQueryLiteral("Artist's folder")).toBe("Artist\\'s folder");
    expect(escapeDriveQueryLiteral("path\\name")).toBe("path\\\\name");
    expect(escapeDriveQueryLiteral("\\' or trashed = true or name = '")).toBe("\\\\\\' or trashed = true or name = \\'");
  });
});
