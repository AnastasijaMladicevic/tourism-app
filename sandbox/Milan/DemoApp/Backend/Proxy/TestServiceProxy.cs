public class TestServiceProxy
{
  private readonly TestService service = new TestService();

  public TestData GetData()
  {
    // ovde može logging, autorizacija itd.
    return service.GetData();
  }
}