import org.testng.Assert;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.sql.SQLOutput;
import java.time.Duration;



public class BrowserCommands {

    WebDriver driver;

    @BeforeMethod
    public void setUp(){
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    }



    @Test
    public void testOpenBrowser(){
        driver.get("https://www.ebay.com/");

        String currUrl = driver.getCurrentUrl();
        Assert.assertTrue(currUrl.contains("ebay.com"),"URL does not contain ebay.com");


        String pageTitle = driver.getTitle();
        int pageLength = pageTitle.length();
        int pageSourceLen = driver.getPageSource().length();

        System.out.println("Page Title : " + pageTitle);
        System.out.println("Title length : " + pageLength);
        System.out.println("Current URL : " + currUrl);
        System.out.println("Page Source Length : "+pageSourceLen);



    }

    @AfterMethod
    public void closeUp(){

        driver.quit();

    }
}
