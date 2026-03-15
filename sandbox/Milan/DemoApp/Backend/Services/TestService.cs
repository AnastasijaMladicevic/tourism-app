public class TestService
{
  private readonly TestRepository repository = new TestRepository();

  public TestData GetData()
  {
    var data = new TestData();
    data.Messages = repository.GetMessages();
    return data;
  }
}