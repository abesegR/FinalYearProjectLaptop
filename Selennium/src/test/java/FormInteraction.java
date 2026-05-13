import org.checkerframework.checker.units.qual.C;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.Select;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class FormInteraction {

    WebDriver driver;

    @BeforeMethod
    public void setUp(){
        driver = new ChromeDriver();
        driver.manage().window().maximize();

    }

    @Test
    public void runBrowserCmd() throws InterruptedException {

        driver.get("https://www.ebay.com/sch/ebayadvsearch");
        String pageTitle = driver.getTitle();
        Assert.assertTrue(pageTitle.contains("Advanced Search"),"Page title False");

        WebElement keyword = driver.findElement(By.id("_nkw"));

        keyword.sendKeys("laptop");
        Assert.assertTrue(keyword.getAttribute("value").contains("laptop"),"False keyword");

        WebElement category =  driver.findElement(By.id("s0-1-20-4[0]-7[3]-_sacat"));

        Select selectCategory = new Select(category);

        selectCategory.selectByVisibleText("Baby");

        Thread.sleep(2000);
        selectCategory.selectByValue("267");


        WebElement lowPrice = driver.findElement(By.id("s0-1-20-5[2]-@range-comp[]-@range-textbox[]-textbox"));
        WebElement highPrice = driver.findElement(By.id("s0-1-20-5[2]-@range-comp[]-@range-textbox[]_1-textbox"));

        lowPrice.sendKeys("100");
        highPrice.sendKeys("500");

        Assert.assertTrue(lowPrice.getAttribute("value").contains("100"),"Low price falsy");
        Assert.assertTrue(highPrice.getAttribute("value").contains("500"),"High price falsy");

        WebElement buyItNowCheckbox = driver.findElement(By.id("LH_BIN"));
        WebElement auctionCheckbox = driver.findElement(By.id("LH_Auction"));

        if (!buyItNowCheckbox.isSelected()) buyItNowCheckbox.click();
        if (!auctionCheckbox.isSelected()) auctionCheckbox.click();



        driver.findElement(By.id("searchBtnLowerLvl")).click();

        Thread.sleep(3000);

        WebElement resultCountElement = driver.findElement(By.className("srp-controls__count-heading"));
        String totalResults = resultCountElement.getText();
        System.out.println("Results Found: " + totalResults);

        WebElement resultsContainer = driver.findElement(By.id("srp-river-results"));
        System.out.println("Is results container displayed? " + resultsContainer.isDisplayed());


    }
}
