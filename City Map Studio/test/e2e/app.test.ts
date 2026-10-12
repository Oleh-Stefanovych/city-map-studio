import { expect, test } from "@mobrowser/cli/e2e";

test("greets the user by name from the button and the Enter key", async ({ page }) => {
  const name = page.getByPlaceholder("Your name");

  await name.fill("Ada");
  await page.getByRole("button", { name: "Greet" }).click();
  await expect(page.getByText("Hello, Ada!", { exact: true })).toBeVisible();

  await name.fill("Grace Hopper");
  await name.press("Enter");
  await expect(page.getByText("Hello, Grace Hopper!", { exact: true })).toBeVisible();
});
